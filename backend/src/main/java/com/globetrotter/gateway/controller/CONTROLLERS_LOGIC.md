# Backend Controllers — Logic Audit & Implementation Status

This document provides a factual, code-verified audit of all 9 REST controllers in `com.globetrotter.gateway.controller`.

---

## 1. AuthController (`/api/auth`)
- **File**: `AuthController.java`
- **Endpoints**:
  - `POST /api/auth/login`: Authenticates user credentials via `AuthService.authenticate()`.
  - `POST /api/auth/register`: Registers a new tourist account via `AuthService.register()`.
  - `GET /api/auth/me`: Returns current authenticated principal object.
- **Implemented Logic**:
  - Validates request payloads with `@Valid` (`AuthRequest`, `RegisterRequest`).
  - Enforces IP-based rate limiting via `RateLimitingService.tryConsumeAuth("login_" + clientIp)` (5 attempts/min).
  - Extracts client IP supporting `X-Forwarded-For` header with fallback to `request.getRemoteAddr()`.
  - Auto-logs in after registration and returns JWT token.
- **Not Yet Implemented / Gaps**:
  - No Refresh Token or Token Rotation mechanism (only single JWT with 24h lifespan).
  - No Password Reset / Forgot Password endpoints or email flow.
  - No Email verification / OTP confirmation before activating accounts.
  - `/me` endpoint returns raw Spring Security `UserDetailsImpl` principal object rather than a sanitized DTO.

---

## 2. BookingController (`/api/bookings`)
- **File**: `BookingController.java`
- **Endpoints**:
  - `POST /api/bookings/checkout`: Creates a `PENDING` booking (Step 1 of purchase).
  - `GET /api/bookings/my-passes`: Returns bookings for the authenticated user ordered by creation date descending.
  - `GET /api/bookings/{reference}`: Fetches single booking details. Accessible to pass owner or Admin.
  - `GET /api/bookings/verify/qr-image/{reference}`: Public endpoint serving raw PNG image bytes (`image/png`) of the QR pass.
- **Implemented Logic**:
  - Enforces authentication for checkout, viewing personal passes, and checking booking status.
  - Strict ownership check on `GET /{reference}`: Non-admin users cannot inspect other tourists' passes.
  - Serves QR image with HTTP header `Cache-Control: max-age=3600, public` (1-hour client-side cache).
  - Rejects serving QR image if payment status is not `PAID`.
- **Not Yet Implemented / Gaps**:
  - No cancellation or refund initiation endpoint (`POST /api/bookings/{reference}/cancel`).
  - No support for rescheduling visit start dates once booked.
  - No bulk booking or tour operator discount logic.

---

## 3. PaymentController (`/api/payments`)
- **File**: `PaymentController.java`
- **Endpoints**:
  - `POST /api/payments/initiate?reference=GT-XXXXXXXX`: Creates Razorpay order in paise.
  - `POST /api/payments/verify`: Verifies Razorpay HMAC-SHA256 signature and activates booking.
- **Implemented Logic**:
  - Rate limiting applied: 10 attempts per minute per authenticated user (`tryConsumePayment`).
  - Returns `PaymentInitiateResponse` containing public Razorpay Key ID, Order ID, amount, and customer details.
  - On verification, marks booking `PAID`, activates HMAC QR token, and creates attraction redemption slots.
- **Not Yet Implemented / Gaps**:
  - No Razorpay Webhook listener endpoint (`POST /api/payments/webhook`) to handle asynchronous server-to-server notifications if user closes browser during redirect.
  - No automatic refund processing or payment retry state machine for failed transactions.
  - Default config uses placeholder test keys (`rzp_test_DEMO_KEY_HERE`) unless environment variables are injected.

---

## 4. ScannerController (`/api/verify`)
- **File**: `ScannerController.java`
- **Endpoints**:
  - `POST /api/verify/scan`: Validates QR pass token or booking reference at gate turnstiles.
  - `GET /api/verify/pass/{passToken}`: Inspects booking details by pass token or reference.
- **Implemented Logic**:
  - Secured with Spring Security: requires `ROLE_STAFF` or `ROLE_ADMIN`.
  - Rate limiting applied: 60 scans per minute per gate terminal / staff username.
  - Delegates redemption to `VerificationService` which performs cryptographic signature check, validity dates check, circuit attraction membership check, and atomic database check-in.
- **Not Yet Implemented / Gaps**:
  - Offline mode validation: Scanner controller requires real-time connection to backend DB; no signed offline credential revocation list (CRL) is cached locally on gate devices.
  - No turnstile hardware pulse trigger relay integration (e.g. GPIO or webhook to physical barrier).

---

## 5. CircuitController (`/api/circuits`)
- **File**: `CircuitController.java`
- **Endpoints**:
  - `GET /api/circuits?state={state}`: Lists active circuits with optional Pan-India state filtering (`Andhra Pradesh`, `Telangana`, etc.).
  - `GET /api/circuits/states`: Returns list of distinct states hosting tourism circuits for regional navigation tabs.
  - `GET /api/circuits/featured`: Lists featured circuits (Caffeine cached).
  - `GET /api/circuits/{idOrSlug}`: Resolves circuit by numeric ID or URL slug string (Caffeine cached).
  - `POST /api/circuits/{id}/optimize-route?startPlaceId={id}&startTime={HH:mm}`: Solves Time-Constrained Traveling Salesperson Problem (TSP-TW) over circuit attractions using exact branch-and-bound permutation search, Haversine distance matrix, and gate opening/closing hours.
  - `POST /api/circuits/{id}/next-location?currentPlaceId={id}&currentTime={HH:mm}&visitedPlaceIds={1,2}`: Real-time dynamic re-routing recommending the next best unvisited stop minimizing travel time and idle wait while avoiding closed gates.
  - `GET /api/circuits/{id}/corridor-places`: Finds geo-proximate attractions along the highway corridor of a circuit.
  - `POST /api/circuits/custom-route`: Arbitrary custom itinerary optimization given any set of place IDs and optional start place.
- **Implemented Logic**:
  - Publicly accessible (no authentication required).
  - Dual lookup: Tries `Long.parseLong(idOrSlug)` first; if `NumberFormatException`, looks up by slug.
  - State filtering queries DB via indexed `findByStateIgnoreCaseAndIsActiveTrueOrderByDisplayOrderAsc`.
  - Route optimization calculates inter-stop distances, travel duration at 30 km/h urban speed, idle arrival wait times, and validates gate opening windows.
- **Not Yet Implemented / Gaps**:
  - Default average transit speed is fixed at 30 km/h rather than dynamic live traffic API integration.

---

## 6. PlaceController (`/api/places`)
- **File**: `PlaceController.java`
- **Endpoints**:
  - `GET /api/places`: Lists all active attractions (Caffeine cached).
  - `GET /api/places/districts`: Returns a sorted state-to-district map (`Map<String, List<String>>`) covering all 59 districts of Andhra Pradesh and Telangana.
  - `GET /api/places/district/{district}`: Queries all verified attractions for a specific district (e.g. `Alluri Sitharama Raju (ASR) District`, `Hanumakonda District`).
  - `GET /api/places/category/{category}`: Filters attractions by category (e.g. Heritage, Nature, Temple, Wildlife).
  - `GET /api/places/{idOrSlug}`: Dual lookup by numeric ID or URL slug string.
  - `GET /api/places/{idOrSlug}/guide?day={day}&time={time}`: Returns complete ground-truth guide (`PlaceGuideDTO`) combining dynastic history, 15-point ground reality dossier, sensory atmosphere, transit details, and time-dependent crowd forecast.
  - `GET /api/places/{id}/crowd-forecast?day={day}&time={time}`: Generates instant diurnal crowd forecast (`CrowdForecastDTO`) using Non-Homogeneous Poisson arrival simulation, Kingman queue approximation, hourly busyness profile, and bypass savings.
- **Implemented Logic**:
  - Publicly accessible.
  - Case-insensitive category and district matching.
  - Caffeine in-memory caching on high-frequency queries.
- **Not Yet Implemented / Gaps**:
  - Spatial PostGIS / GeoJSON polygon query endpoint for arbitrary map bounding boxes.

---

## 7. AiChatController (`/api/chat`)
- **File**: `AiChatController.java`
- **Endpoints**:
  - `POST /api/chat/message`: Processes tourist query with grounding context.
  - `GET /api/chat/history/{sessionId}`: Retrieves past conversation transcript.
- **Implemented Logic**:
  - Publicly accessible (supports anonymous tourists or authenticated users).
  - Auto-generates session ID if missing.
  - Grounded against live database circuits and places.
- **Not Yet Implemented / Gaps**:
  - **Identified Gap**: `rateLimitingService.tryConsumeChat()` is defined in `RateLimitingService.java` (20 msgs/min) but was NOT invoked in `AiChatController.java`.
  - No streaming response (SSE / WebSocket); responses are returned as single synchronous JSON.

---

## 8. AnalyticsController (`/api/admin`)
- **File**: `AnalyticsController.java`
- **Endpoints**:
  - `GET /api/admin/analytics`: Aggregates visitor metrics, revenue, check-in counts, and recent scans.
- **Implemented Logic**:
  - Restricted to `ROLE_ADMIN` via `SecurityConfig`.
  - Single eager-fetch query for recent check-ins to eliminate N+1 latency.
- **Not Yet Implemented / Gaps**:
  - No date-range filter parameters (e.g., `?startDate=...&endDate=...`); aggregates over all time and today only.
  - No CSV/PDF report export endpoint.

---

## 9. AdminController (`/api/admin`)
- **File**: `AdminController.java`
- **Endpoints**:
  - `GET /api/admin/circuits/all`: Lists all circuits including inactive.
  - `POST /api/admin/circuits`: Creates new circuit.
  - `PUT /api/admin/circuits/{id}`: Updates circuit.
  - `DELETE /api/admin/circuits/{id}`: Soft-deletes circuit (sets `active = false`).
  - `POST /api/admin/circuits/{circuitId}/places`: Links place to circuit with sequence and transit notes.
  - `GET /api/admin/places/all`: Lists all attractions including inactive.
  - `POST /api/admin/places`: Creates attraction.
  - `PUT /api/admin/places/{id}`: Updates attraction.
  - `DELETE /api/admin/places/{id}`: Soft-deletes attraction.
- **Implemented Logic**:
  - Guarded with `@PreAuthorize("hasRole('ADMIN')")`.
  - Auto-generates URL slugs from titles if omitted.
  - Cache eviction: triggers `@CacheEvict(allEntries = true)` on update/delete.
- **Not Yet Implemented / Gaps**:
  - Frontend currently lacks management UI forms to call these CRUD endpoints (frontend only has Admin Analytics view).
  - No image file upload multipart endpoint (image URLs must be provided as text strings).

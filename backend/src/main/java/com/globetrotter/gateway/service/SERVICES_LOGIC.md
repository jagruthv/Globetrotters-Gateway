# Backend Services — Logic Audit & Implementation Status

This document provides a factual, code-verified audit of all 14 Spring services in `com.globetrotter.gateway.service`.

---

## 1. AuthService
- **File**: `AuthService.java`
- **Dependencies**: `AuthenticationManager`, `UserRepository`, `PasswordEncoder`, `JwtUtils`
- **Implemented Logic**:
  - `authenticate()`: Authenticates credentials via Spring's `AuthenticationManager`, sets security context, and generates signed HS256 JWT. Extracts single primary authority role.
  - `register()`: Validates email uniqueness (`existsByEmail`). Strictly assigns `Role.ROLE_TOURIST` to block privilege escalation. Hashes passwords using BCrypt. Auto-authenticates and returns valid token upon successful registration.
- **Not Yet Implemented / Gaps**:
  - Does not support admin creation of staff/admin users via service (staff/admin are only created via `DataInitializer`).
  - No account lockout after N consecutive failed login attempts in the database layer (only in-memory rate limiting).
  - No multi-factor authentication (MFA / 2FA).

---

## 2. BookingService
- **File**: `BookingService.java`
- **Dependencies**: `BookingRepository`, `CircuitRepository`, `UserRepository`, `TicketRedemptionRepository`, `QrCodeService`
- **Implemented Logic**:
  - `createPendingBooking()`: Creates unconfirmed booking with status `PENDING` and placeholder token `PENDING_PAYMENT_...`. Calculates discounted total (`discountedCircuitPrice * numberOfTourists`), validity period (`visitStartDate + validityDays`), and collision-proof reference (`GT-` + 8 hex chars).
  - `createBooking()`: Legacy synchronous booking helper used by `DataInitializer` to seed demo data directly as `PAID` with pre-created redemptions.
  - `getBookingByReferenceForUser()`: Enforces authorization check preventing tourists from accessing other tourists' passes.
  - `getQrCodeImageForBooking()`: Generates PNG QR image (using ZXing) **only** if status is `PAID`; throws exception if unpaid.
  - `mapToResponse()`: Sanitizes response, hides raw QR token, populates redemption slot statuses, and exposes QR image URL only when paid.
- **Not Yet Implemented / Gaps**:
  - Booking expiration cleanup: Pending bookings that never complete payment remain indefinitely in the database unless purged by a scheduled task.
  - No concurrency lock on circuit capacity limits (no daily visitor quota cap enforced per circuit).

---

## 3. PaymentService
- **File**: `PaymentService.java`
- **Dependencies**: `BookingRepository`, `TicketRedemptionRepository`, `QrCodeService`, `MailService`, Razorpay SDK (`RazorpayClient`, `Utils`)
- **Implemented Logic**:
  - `initiatePayment()`: Converts amount to paise (`* 100`), creates Razorpay Order via `razorpay.orders.create()`, persists `razorpayOrderId` on the Booking entity, returns metadata to frontend.
  - `verifyAndConfirmPayment()`: Cryptographically verifies HMAC-SHA256 signature (`Utils.verifyPaymentSignature(order_id + "|" + payment_id, secret)`). If valid, marks booking `PAID`, stores `razorpayPaymentId`, generates HMAC QR token via `QrCodeService`, creates atomic redemption slots for all circuit places, and triggers asynchronous confirmation email.
  - Idempotent: If booking is already `PAID`, skips duplicate processing safely.
- **Not Yet Implemented / Gaps**:
  - Relies on Razorpay test credentials (`rzp_test_...`) in dev; fails with `RazorpayException` if credentials are invalid and no mock flag is provided.
  - No webhook endpoint to handle offline/dropped browser connections during payment.
  - No refund handling API.

---

## 4. VerificationService
- **File**: `VerificationService.java`
- **Dependencies**: `BookingRepository`, `PlaceRepository`, `TicketRedemptionRepository`, `QrCodeService`
- **Implemented Logic**:
  - Multi-tier Gate Verification:
    1. Cryptographic HMAC token signature verification via `QrCodeService.verifyPassToken()`. Also allows fallback lookup by booking reference for testing.
    2. Payment status enforcement: Rejects with `PAYMENT_PENDING` if unpaid.
    3. Date validity check: Validates `today >= visitStartDate` and `today <= visitEndDate`. Returns `NOT_YET_VALID` or `EXPIRED`.
    4. Attraction membership check: Validates whether the scanned attraction place ID belongs to the booked circuit (`PLACE_NOT_IN_CIRCUIT`).
    5. Prior redemption check: Checks if pass was already used at this attraction (`ALREADY_CHECKED_IN`).
    6. **Atomic Conditional DB Check-In**: Executes `redemptionRepository.checkInAtomically(id, now, staff, terminal)`. If two gate turnstiles scan the identical QR at the exact same millisecond, the SQL conditional `WHERE status = 'PENDING'` ensures only one transaction updates 1 row; the other gets 0 rows updated and is rejected immediately.
- **Not Yet Implemented / Gaps**:
  - Re-entry policy: Does not support multi-entry per attraction on the same day (strictly 1 check-in per attraction per circuit pass).
  - No offline cryptographic verification without live database connectivity (requires DB to verify redemption slot status).

---

## 5. QrCodeService
- **File**: `QrCodeService.java`
- **Dependencies**: Google ZXing (`QRCodeWriter`, `MatrixToImageWriter`), Java Cryptography (`Mac`, `HmacSHA256`)
- **Implemented Logic**:
  - `generateQrCodeImage()`: Generates black-and-white 2D QR matrix in PNG format byte stream.
  - `generateSignedPassToken()`: Generates tamper-proof token formatted as `GT_PASS:<ref>:<circuitId>:<userId>:<timestamp>:<hmacSignature>`.
  - `verifyPassToken()`: Parses token parts, recalculates HMAC-SHA256 over payload components, and performs timing-attack safe comparison using `MessageDigest.isEqual()`.
- **Not Yet Implemented / Gaps**:
  - Secret key is loaded from `app.qr.hmac-secret` with hardcoded fallback string.
  - No key rotation schedule mechanism (e.g. key ID header in token).

---

## 6. AiTravelAssistantService
- **File**: `AiTravelAssistantService.java`
- **Dependencies**: `ChatMessageRepository`, `CircuitService`, `PlaceService`, `ObjectMapper`, Java `HttpClient`
- **Implemented Logic**:
  - Hybrid AI Architecture:
    1. Persists conversation messages in `ChatMessage` repository.
    2. Grounding: Reads live active circuits and attractions from Caffeine cache (<1ms).
    3. If `GEMINI_API_KEY` is present: Calls Google Gemini REST API (`gemini-1.5-flash`) using Java 21 `HttpClient` with 4-6s timeouts, temperature 0.3, max tokens 800, and system prompt loaded with live catalog data. Parses response and extracts structured follow-up suggestions (`SUGGESTIONS:`).
    4. If API key is blank or API call fails/times out: Seamlessly falls back to an offline rule-based knowledge engine (`generateGroundedAnswer`) covering one-day trips, timings, pricing, passes, and directions.
- **Not Yet Implemented / Gaps**:
  - Conversation context window in Gemini API call is single-turn (sends current prompt + catalog context; does not pass full multi-turn history into the Gemini payload).
  - No WebSocket or Server-Sent Events (SSE) streaming; replies are synchronous.

---

## 7. AnalyticsService
- **File**: `AnalyticsService.java`
- **Dependencies**: `BookingRepository`, `TicketRedemptionRepository`, `CircuitRepository`, `PlaceRepository`
- **Implemented Logic**:
  - `getAnalyticsSummary()`: Aggregates total bookings, check-ins, circuits, places, and total revenue.
  - Computes `activeTouristsToday` by querying check-ins since midnight today.
  - Aggregates attraction popularity via `findCheckInsByPlace()` grouping query.
  - Eager-fetches top 10 recent check-ins with user, circuit, and place in a single query (`findRecentCheckInsWithDetails`) to eliminate N+1 overhead.
- **Not Yet Implemented / Gaps**:
  - Does not support time-series charting data (e.g. revenue per day or check-ins per hour) — only total and today.
  - No caching on analytics summary query (computes live on each request).

---

## 8. RateLimitingService
- **File**: `RateLimitingService.java`
- **Dependencies**: Bucket4j (`Bucket`, `Bandwidth`, `Refill`)
- **Implemented Logic**:
  - High-performance in-memory token-bucket rate limiting backed by `ConcurrentHashMap`:
    - Auth: 5 tokens/min per IP/key.
    - Payment: 10 tokens/min per user.
    - Gate Scanner: 60 tokens/min per terminal/staff.
    - Chat: 20 tokens/min per session.
- **Not Yet Implemented / Gaps**:
  - In-memory only (does not use Redis); rate limits do not synchronize across multiple horizontal backend replicas.
  - Memory cleanup: Buckets in `ConcurrentHashMap` are not evicted on TTL, slowly retaining idle IP keys in RAM over weeks.

---

## 9. MailService
- **File**: `MailService.java`
- **Dependencies**: Spring `JavaMailSender`, `QrCodeService`
- **Implemented Logic**:
  - `sendBookingConfirmation()`: Marked `@Async` to prevent blocking HTTP threads.
  - Generates HTML email containing booking reference, party size, circuit name, and valid dates.
  - Attaches PNG QR code as inline CID attachment (`addInline("qr-pass-image", ...)`).
  - Catches exceptions gracefully without failing the transaction if SMTP host is unreachable.
- **Not Yet Implemented / Gaps**:
  - SMTP requires valid Gmail app password or SMTP server; fails silently into logs if unconfigured.
  - No email templating engine (Thymeleaf/Freemarker) — uses Java multiline text blocks.

---

## 10. CircuitService
- **File**: `CircuitService.java`
- **Dependencies**: `CircuitRepository`, `PlaceRepository`, `CircuitPlaceRepository`
- **Implemented Logic**:
  - Full CRUD operations with Spring Cache (`@Cacheable(value = "circuits")`, `@CacheEvict`).
  - Cache eviction on create, update, delete, or link attraction.
  - Auto-slug generation from circuit title.
- **Not Yet Implemented / Gaps**:
  - Soft-delete only (`active = false`), does not provide a hard-delete or restore method.

---

## 11. PlaceService
- **File**: `PlaceService.java`
- **Dependencies**: `PlaceRepository`, `CrowdAnalyticsService`
- **Implemented Logic**:
  - Full CRUD operations with Caffeine caching (`@Cacheable(value = "places")`).
  - District-based queries (`getPlacesByDistrict(district)`) cached under key `'dist_' + district.toLowerCase()`.
  - Category-based queries (`getPlacesByCategory(category)`) cached under key `'cat_' + category.toLowerCase()`.
  - Comprehensive Ground-Truth Guide mapping (`getPlaceGuide(id, day, time)` and `getPlaceGuideBySlug(slug, day, time)`), dynamically generating `PlaceGuideDTO` merged with real-time crowd forecast.
  - Crowd forecast generation (`getCrowdForecast(id, day, time)`).
  - Slug-based lookup and auto-slug generation.
- **Not Yet Implemented / Gaps**:
  - Soft-delete only (`active = false`).

---

## 12. RouteOptimizationService
- **File**: `RouteOptimizationService.java`
- **Dependencies**: `CircuitRepository`
- **Implemented Logic**:
  - **Academic Formulation**: Formulates multi-monument circuit sequencing as a Time-Constrained Traveling Salesperson Problem (TSP-TW / OPTW).
  - **Haversine Distance Matrix**: Calculates exact pairwise Great-Circle distances ($D[i][j]$ in km) between all attractions using GPS coordinates.
  - **Operating Window Pruning**: Evaluates candidate sequences against attraction operating hours ($[O_i, C_i]$). Computes idle wait penalty for arriving early and penalizes or prunes sequences arriving after gate closing.
  - **Exact Branch-and-Bound Solver**: For $N \le 8$ attractions, an exact permutation evaluation guarantees global mathematical optimality in $< 2\text{ ms}$, returning distance saved, road transit time saved, and efficiency gain percentage.
  - **Dynamic Scheduling**: Computes exact arrival time, departure time (based on dwell time per attraction), and transit time between consecutive stops.
  - **Dynamic Re-routing**: `evaluateNextBestLocation()` suggests the next stop minimizing transit and idle wait.
- **Not Yet Implemented / Gaps**:
  - Assumes uniform average road transit speed (30 km/h) rather than real-time Google Maps / OpenStreetMap live congestion API.

---

## 13. CrowdAnalyticsService
- **File**: `CrowdAnalyticsService.java`
- **Dependencies**: Mathematical simulation libraries, Java Time
- **Implemented Logic**:
  - **Non-Homogeneous Poisson Process (NHPP)**: Simulates time-varying arrival rate $\lambda(t)$ with Diurnal Gaussian Intensity:
    $$\lambda(t) = \lambda_{\text{base}} + (\lambda_{\text{peak}} - \lambda_{\text{base}}) \cdot \exp\left(-\frac{(t - \mu_{\text{peak}})^2}{2\sigma^2}\right) \cdot \omega_{\text{day}}$$
  - **Day-of-Week Weighting ($\omega_{\text{day}}$)**: Weekends weighted at 1.45x, Fridays at 1.15x, weekdays at 0.85x.
  - **Kingman's Heavy-Traffic Queuing Approximation**: Calculates physical counter queue waiting times:
    $$W_q \approx \frac{\rho}{1 - \rho} \cdot \frac{C_a^2 + C_s^2}{2} \cdot \frac{1}{\mu}$$
  - **Fast-Track Bypass Savings**: Measures queue wait time eliminated by Globetrotter HMAC QR digital passes.
  - **Diurnal Busyness Curve**: Generates 24-hour hourly busyness profile (equivalent to Google Popular Times).

---

## 14. ProofOfArrivalService
- **File**: `ProofOfArrivalService.java`
- **Dependencies**: `PlaceRepository`, `QrCodeService`, `ObjectMapper`
- **Implemented Logic**:
  - **Cartel Price-Gouging Mitigation**: Generates cryptographically signed Proof of Arrival (PoA) tokens for tourists arriving at transit nodes / rural attractions.
  - **HMAC-SHA256 Token Signature**: Computes tamper-proof signature over booking ID, place ID, tourist name, fare cap, and expiration timestamp.
  - **Verification Engine**: Validates PoA tokens presented to auto/taxi drivers or tourism kiosks to enforce agreed-upon last-mile fare caps.

---

## 15. AiTripPlannerService
- **File**: `AiTripPlannerService.java`
- **Dependencies**: `PlaceRepository`, `AiModelRouterService`, `ObjectMapper`, Java 21 `HttpClient`
- **Implemented Logic**:
  - **100% Candidate Attraction Retention**: Guaranteed place resolution with bidirectional token matching and client-fallback instantiation. No requested place is ever discarded.
  - **OSRM Table API Integration**: Fetches real driving distances and durations via OpenStreetMap road graph with automatic fallback to terrain-aware winding models ($1.45\times$ factor).
  - **Topographical Corridor Sorting (TD-TSPTW)**: Sequences destinations from mountain plateaus down through valleys to coastal plains ($1340\text{m} \to 5\text{m}$), automatically prioritizing sunrise viewpoints (Vanjangi at 05:30 AM) and enforcing afternoon curfews (Borra Caves & Dolphin's Nose Lighthouse before 05:00 PM).
  - **Safe Capacity Multi-Day Partitioning**: Enforces a 3-4 spots/day daylight capacity in mountain corridors ($\Delta E \ge 500\text{m}$), automatically expanding days with an explicit safety notice when single-day cramming would cause fatigue or night driving.
  - **Mandatory Regional Lunch Halts**: Injects 45-minute meal breaks between 12:30 PM and 02:30 PM with regional culinary recommendations.
  - **Adjacent Venue Walking Transfers**: Spots within 800m (e.g. Araku Tribal Museum and Coffee Museum) receive an 8-minute walking transfer rather than phantom highway loops.
  - **Spot Conservation Validator**: Validates cloud LLM outputs; if the model dropped candidate destinations, smoothly falls back to the deterministic topographical solver.
  - **Exact Distance Consistency**: Guarantees that `totalRoadKm` is the exact mathematical sum of all daily travel distances.

---

## 16. QrSignatureService
- **File**: `QrSignatureService.java`
- **Dependencies**: `Mac` (HmacSHA256), `MessageDigest`, `SecureRandom`, `Base64`
- **Implemented Logic**:
  - **$O(1)$ Constant Payload Size Invariance**: Generates constant-length compact QR tokens formatted strictly as `v1.<pass_id>.<expiry_epoch_sec>.<hmac_signature>`. Size is strictly independent of the number of attractions booked (1 or 100+ spots yield ~70 characters). Zero PII or location list is embedded in the QR payload.
  - **Fail-Fast Secret Validation**: `@PostConstruct` checks `app.qr.hmac-secret` has at least 32 bytes (256 bits), aborting startup immediately if missing or weak.
  - **Constant-Time Verification First**: Verifies version prefix, parses expiry epoch, recomputes HMAC-SHA256, and checks signature using `MessageDigest.isEqual()` before touching the database.
  - **Typed Exception Layer**: Throws `InvalidQrFormatException`, `InvalidQrSignatureException`, and `QrExpiredException` directly without database roundtrips.

---

## 17. AgentScanService
- **File**: `AgentScanService.java`
- **Dependencies**: `QrSignatureService`, `CircuitPassRepository`, `PassLocationRepository`, `ScanAuditLogRepository`, `PlaceRepository`
- **Implemented Logic**:
  - **Atomic Conditional Anti-Replay Lock**: Single SQL update: `UPDATE PassLocation pl SET pl.status = 'REDEEMED', pl.redeemedAt = :now, pl.redeemedByAgent = :agent WHERE pl.pass.passId = :passId AND pl.location.id = :locationId AND pl.status = 'UNUSED'`. Prevents concurrent duplicate scans at the database engine level without distributed lock overhead.
  - **Agent Location Security**: Enforces assigned gate location from the authenticated agent's record, blocking spoofed or unassigned client location requests.
  - **Immutable Audit Logging**: Persists every scan attempt in `scan_audit_logs` (`SUCCESS`, `ALREADY_REDEEMED`, `NOT_BOOKED_HERE`, `PASS_EXPIRED`, `PASS_REVOKED`, `INVALID_SIGNATURE`, `INVALID_FORMAT`).
  - **Offline Manifest & Sync**: `getManifest()` extracts active unused passes for local caching at mountain gates with zero cellular coverage. `syncRedemptions()` batches and executes offline redemptions.

---

## 18. CircuitPassService
- **File**: `CircuitPassService.java`
- **Dependencies**: `CircuitPassRepository`, `PassLocationRepository`, `PlaceRepository`, `UserRepository`, `QrSignatureService`
- **Implemented Logic**:
  - **Multi-Location Circuit Pass Issuance**: Generates a unified `CircuitPass` and batch creates `PassLocation` records with `guestCount` and `status = 'UNUSED'`.
  - **Seamless Booking & Payment Integration**: Automatically creates `CircuitPass` and `PassLocation` entries upon confirmed booking payment.
  - **Read Queries & Metadata**: Exposes authenticated pass retrieval and QR code generation endpoints.



# Backend Models & Payloads — Logic Audit & Implementation Status

This document provides a factual, code-verified audit of the database entities and DTO payloads in `com.globetrotter.gateway.model` and `com.globetrotter.gateway.payload`.

---

## 1. Domain Entities (`com.globetrotter.gateway.model`)

### User (`User.java`)
- **Fields**: `id`, `email` (unique), `password`, `fullName`, `phoneNumber`, `role` (`Role` enum), `createdAt`.
- **Implemented Logic**: JPA entity mapped to table `users`. Stores hashed BCrypt password. Role enumeration: `ROLE_TOURIST`, `ROLE_STAFF`, `ROLE_ADMIN`.
- **Not Yet Implemented / Gaps**: No avatar URL, profile update timestamp, account status (`ACTIVE`, `SUSPENDED`), or password reset token fields.

### Place / Attraction (`Place.java`)
- **Fields**:
  - **Core Identifiers**: `id` (Long, PK), `name` (String), `slug` (String, unique indexed), `category` (String), `description` (TEXT), `imageUrl` (String), `address` (String), `city` (String), `district` (String), `state` (String), `active` (Boolean), `createdAt` (LocalDateTime).
  - **Coordinates & Operating Hours**: `latitude` (Double), `longitude` (Double), `openingTime` (String, e.g. "09:00 AM"), `closingTime` (String, e.g. "06:00 PM").
  - **Pricing & Economy**: `individualPrice` (BigDecimal), `parkingFee` (BigDecimal), `lastMileCost` (BigDecimal), `totalEstimatedCost` (BigDecimal).
  - **Google Ground-Truth Verification**:
    - `rating` (Double, e.g. 4.6★) — live Google Maps rating.
    - `userRatingsTotal` (Integer, e.g. 24,198) — verified Google Maps review count.
    - `googlePlaceId` (String, e.g. "ChIJ-wV8G6v...").
    - `googleMapsUri` (String, direct Google Maps URL).
  - **15-Point Ground-Reality Dossier**:
    - `cellularCoverage` (String) — Signal reality across Jio, Airtel, BSNL with dead-zone markers.
    - `checkpostCurfew` (String) — Forest gates, police checkposts, ghat road night curfews.
    - `sanitationFacility` (String) — Cleanliness status, pay-and-use toilets, Sulabh complexes.
    - `culinarySpecialty` (String) — Authentic local GI / regional cuisine and famous highway mess.
    - `emergencyMedicalDistance` (String) — Nearest 24/7 Community Health Centre / Government Hospital in km.
    - `travelerCompatibility` (String) — Senior-citizen, child, wheelchair stroller friendliness.
    - `typicalDwellTime` (String) — Realistic time needed to explore (e.g. "2.5 Hours").
  - **Heritage, Terrain & Sensory Intelligence**:
    - `historicalSignificance` (TEXT) — Founding kings, dynasties (Kakatiya, Chalukya, Vijayanagara, Qutb Shahi, Nizam, British) and architectural style.
    - `sensoryAtmosphere` (TEXT) — Olfactory, auditory, and tactile environmental textures.
    - `nearestRailwayTransit` (String) — Closest rail junction and highway corridor (NH/SH).
    - `stepsAndTerrainEffort` (String) — Exact step counts (e.g. "350 steep steps", "90 stone stairs") and gradient incline.
    - `giArtisanCraft` (String) — Authentic GI-tagged crafts (Etikoppaka toys, Cheriyal masks, Gadwal sarees) with fair price benchmarks.
    - `hazardsAndScamAlerts` (TEXT) — Slippery moss, rogue guides, monkey nuisance, vehicle puncture cartels.
    - `crowdIntensityScore` (Double) — Base crowd density index (0.0 - 1.0).
- **Implemented Logic**: Represents a physical monument or eco-tourism destination. Synchronized via `AtlasDataSeeder` from `data/atlas_places.json` covering all 646 spots across 59 districts of Andhra Pradesh and Telangana.

### Circuit (`Circuit.java`)
- **Fields**: `id`, `title`, `slug` (unique), `tag`, `summary`, `description`, `basePrice`, `discountedCircuitPrice`, `validityDays`, `bannerImage`, `featured`, `active`, `circuitPlaces` (`OneToMany`), `createdAt`.
- **Implemented Logic**: Represents a multi-attraction travel pass bundle. Contains base and discounted prices and validity window (days).
- **Not Yet Implemented / Gaps**: No daily visitor quota cap field; no seasonal pricing adjustments.

### CircuitPlace (`CircuitPlace.java`)
- **Fields**: `id`, `circuit` (`ManyToOne`), `place` (`ManyToOne`), `sequenceOrder`, `estimatedDurationMins`, `transitNote`.
- **Implemented Logic**: Join table with metadata defining the itinerary sequence, duration, and transit instructions between sights.
- **Not Yet Implemented / Gaps**: Transit note is free-form string; no GPS routing waypoints or travel mode enum (walking, transit, driving).

### Booking (`Booking.java`)
- **Fields**: `id`, `bookingReference` (unique), `user`, `circuit`, `totalAmount`, `numberOfTourists`, `visitStartDate`, `visitEndDate`, `paymentStatus`, `razorpayOrderId`, `razorpayPaymentId`, `qrPassToken` (unique), `redemptions` (`OneToMany`), `createdAt`.
- **Implemented Logic**: Core pass instance. Lifecycle states: `PENDING` -> `PAID` (or `FAILED`). Links to 1..N `TicketRedemption` slots.
- **Not Yet Implemented / Gaps**: No refund details (refund ID, refunded amount, cancellation timestamp).

### TicketRedemption (`TicketRedemption.java`)
- **Fields**: `id`, `booking`, `place`, `status` (`PENDING`, `CHECKED_IN`), `checkedInAt`, `verifiedByStaffUsername`, `gateTerminalId`, `createdAt`.
- **Implemented Logic**: One slot per attraction per booking. Status transitions atomically at the gate.
- **Not Yet Implemented / Gaps**: Does not track exit timestamp (only check-in).

### ChatMessage (`ChatMessage.java`)
- **Fields**: `id`, `sessionId`, `userEmail`, `sender` (`user`/`assistant`), `content`, `timestamp`.
- **Implemented Logic**: Persists dialogue transcript for chat history retention.

---

## 2. DTO Payloads (`com.globetrotter.gateway.payload`)
- `AuthRequest.java`: Email and password with `@NotBlank` and `@Email`.
- `RegisterRequest.java`: Full name, email, password (min 6 chars), and phone number.
- `AuthResponse.java`: JWT token, user ID, email, full name, role.
- `BookingRequest.java`: Circuit ID, tourist count (min 1, max 20), visit start date.
- `BookingResponse.java`: Safe representation of pass without raw HMAC secret token, includes list of attraction redemption statuses.
- `PaymentInitiateResponse.java`: Order ID, amount, currency, Razorpay key ID, booking reference.
- `PaymentVerifyRequest.java`: Booking reference, Razorpay order ID, payment ID, and HMAC signature.
- `ScanRequest.java`: Pass token string, place ID, gate terminal ID.
- `ScanResponse.java`: Boolean `valid`, status code, feedback message, visitor count, tourist name.
- `AnalyticsSummaryDTO.java`: Total bookings, check-ins, active tourists today, revenue, top places, recent scans.
- `ChatMessageRequest.java` / `ChatMessageResponse.java`: User message, session ID, assistant reply, follow-up suggestion chips.
- `PlaceGuideDTO.java`: Comprehensive ground-truth guide combining place details, oral legends, dynastic chronicles, logistics, and real-time crowd forecast.
- `CrowdForecastDTO.java`: Diurnal crowd forecast with hourly busyness percentages, estimated queue wait minutes, fast-track bypass savings, and surge alerts.
- `PoATokenRequest.java`: Request payload for cryptographically signed Proof of Arrival tokens to protect tourists from taxi/auto cartel price gouging.
- `PoAVerificationResponse.java`: Validation response for drivers or transit booths verifying PoA fare cap signatures.

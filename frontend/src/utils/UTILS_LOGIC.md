# Frontend Utilities — Logic Audit & Architectural Documentation

This document provides a factual, code-verified audit of the edge algorithms and offline simulation engines located in `frontend/src/utils`.

---

## 1. Offline Deterministic Route Engine (`offlineRouteEngine.js`)

**Architectural Reality**: Full AI itinerary synthesis and conversational plan redesign are powered by the **Spring Boot Multi-Model AI Router (Groq GPT-OSS 120B / Gemini)** on the backend. The client-side utility in `offlineRouteEngine.js` serves strictly as a **Zero-Connectivity Deterministic Fallback**:
1. **Low-Bandwidth / Zero-Bar Resilience**: Operates in deep valleys, dense forests, and caves where mobile connectivity is unavailable.
2. **Deterministic Constraint Heuristics**: Sequences attractions using geodesic Great-Circle distances, terrain transit speed profiling, and operating hours when the backend AI is unreachable.
3. **Corridor Detour Detection**: Solves "route touch avuthu unde places" (attractions within $\le 28\,\text{km}$ detour of the transit highway).
4. **15-Point Ground-Reality Tourist Education**: Renders ground reality briefings detailing cellular dead-zones, curfews, sanitation, authentic food, and nearest hospital km.

### Key Data Structures & Functions

#### 1. `ALL_59_DISTRICTS`
Exhaustive directory of all 59 districts of Andhra Pradesh (26) and Telangana (33), each tagged with:
- `name`: Full official administrative district name.
- `hq`: District headquarters town.
- `zone`: Geographical zone (e.g. `Uttarandhra`, `Godavari Basin`, `Rayalaseema`, `Capital Region`, `Heritage Heartland`, `Northern Hills & Forests`, `Southern Krishna Basin`).
- `lat` / `lng`: Exact centroid coordinates.

#### 2. Geodesic & Vector Algorithms
- **`haversineDistance(lat1, lon1, lat2, lon2)`**:
  Calculates exact Great-Circle distance over a spherical Earth ($R = 6371.0\,\text{km}$):
  $$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)$$
  $$d = 2R \cdot \text{atan2}(\sqrt{a}, \sqrt{1 - a})$$
- **`calculateDetourKm(pointA, pointB, pointP)`**:
  Calculates perpendicular detour distance of candidate point $P$ from segment $A \to B$:
  $$\text{Detour} = d(A, P) + d(P, B) - d(A, B)$$
- **`findRouteTouchingSpots(selectedSpots, allCandidateSpots, maxDetourKm = 28)`**:
  Scans all candidate spots along every leg of the planned itinerary. Spots within $28\,\text{km}$ detour are flagged with their closest leg, extra driving minutes, and detour overhead, allowing tourists to add roadside attractions with minimal itinerary disruption.

#### 3. Ground-Reality Education (`educateTourist(spot)`)
Generates structured ground-truth cards:
- **📶 Cellular Signal**: Identifies carrier strength (Jio, Airtel, BSNL) and forest dead zones.
- **🚧 Checkpost Curfew**: Details forest gates, tiger reserve entry hours, and ghat road night closures.
- **🚻 Sanitation Reality**: Sulabh facilities, pay-and-use hygiene ratings.
- **🍲 Culinary Specialty**: Authentic GI-tagged dishes, tribal bamboo chicken, local highway mess.
- **⚠️ Hazards & Nearest Hospital**: Slippery moss, troop monkeys, and nearest 24/7 Community Health Centre / Government Hospital in km.
- **⏳ Dwell Time**: Realistic exploration duration (e.g. "2.5 Hours").
- **👥 Accessibility**: Senior citizen, toddler stroller, wheelchair compatibility.

#### 4. Topographical Corridor Sequence Optimizer (TD-TSPTW) (`generateOptimalTripPlan(selectedSpots, options)`)
- **100% Spot Conservation Guarantee**: Retains every candidate destination across partitioned days; zero spots are ever dropped or omitted.
- **Topographical Corridor Sorting (TD-TSPTW)**: Sequences destinations along natural elevation gradients ($1340\text{m} \to 920\text{m} \to 705\text{m} \to 5\text{m}$):
  - **Dawn Viewpoints (e.g. Vanjangi Cloud Hills)**: Automatically scheduled at 05:30 AM sunrise window.
  - **Monument Gate Curfews**: Early closing sites (Borra Caves, Dolphin's Nose Lighthouse closing at 05:00 PM) are prioritized before 04:30 PM cutoff.
  - **Adjacent Venues**: Spots within 800m (e.g. Araku Tribal Museum and Coffee Museum) receive an 8-minute walking transfer rather than phantom vehicle detours.
- **Safe Capacity Multi-Day Partitioning**:
  - Dynamically calculates elevation span $\Delta E = E_{\max} - E_{\min}$.
  - In mountain/ghat corridors ($\Delta E \ge 500\text{m}$), safe capacity is capped at 3 spots/day ($D_{\min} = \lceil N / 3 \rceil$) to prevent fatigue and dangerous night driving on hairpin turns.
  - If requested days $< D_{\min}$, auto-expands with an explicit safety notice explaining monument hours and ghat safety.
- **Mandatory Regional Culinary Halts**: Injects a 45-minute lunch break between 12:30 PM and 02:30 PM, highlighting regional dishes (Bongu Bamboo Chicken, Araku Arabica coffee, Coastal pomfret).
- **Mountain Ghat Transit Velocity**: Enforces $24\text{ km/h}$ ghat transit speed with 12-minute parking buffer for elevation drops $\ge 400\text{m}$, preventing unrealistic descent hallucinations.
- **Exact Mathematical Consistency**: Guarantees that `totalRoadKm` is the exact sum of all daily leg distances ($\sum \text{dayKm}$).
- **Realistic Budgeting**:
  $$\text{Budget} = \text{Verified Tickets} + \text{Parking} + (\text{TripKm} \times ₹6.50) + (\text{Spots} \times ₹250 \times \text{PartySize})$$

#### 5. Local Storage Caching (`fetchDistrictPlacesOffline(districtName, apiFetcher)`)
Tier-1 caching in browser `localStorage` keyed by `globetrotter_offline_v3_district_{name}`. Serves cached places in 0ms, refreshing in the background if network is active.

#### 6. Offline Token Keyword Search (`keywordSpotSearch(query, spots)`)
Fast client-side lexical keyword token scorer for offline environments. Scans query tokens against place name, category, district, and description without cloud API latency.

---

## 2. Cryptographic Pass Engine (`cryptoPassService.js`)

Implements client-side Web Crypto API (`crypto.subtle`) token issuance and verification:
1. **`generateCryptographicPassToken(bookingReference, circuitId, touristId)`**:
   - Generates an HMAC-SHA256 signature using the browser's native `crypto.subtle` API.
   - Outputs the production token format:
     `GT_PASS:<bookingReference>:<circuitId>:<touristId>:<timestamp>:<base64urlSignature>`
2. **`verifyPassCryptographicSignature(token)`**:
   - Validates HMAC-SHA256 signature using `constantTimeEquals` to prevent side-channel timing attacks.
   - Enforces timestamp freshness checks (rejects passes > 5 minutes in future or > 30 days old).

---

## 3. Edge Turnstile Offline Ledger (`offlineTurnstileLedger.js`)

Provides offline gate verification for remote attractions (Borra Caves, Belum Caves, Gandikota, Ramappa Temple):
1. **Cryptographic Validation**: Directly verifies `GT_PASS` tokens via `cryptoPassService.js`.
2. **Anti-Passback Admission Cache**: Prevents double check-ins within the operating session.
3. **Flash Turnstile Ledger**: Maintains local check-in records for end-of-day batch synchronization.

---

## 4. Authentic Photo & Offline Banner Engine (`authenticPlacePhotos.js`)

Consolidates all photographic resolution and zero-network fallback logic:
1. **`EXACT_PLACE_PHOTOS`**: Curated dictionary mapping normalized place keys to verified custodian photographs.
2. **`getAuthenticPlacePhoto(placeOrName)`**: Resolves verified local photography with zero false positives. Returns `null` if unverified so the card displays a clean blank state rather than fake stock images.
3. **`getOfflineImageFallback(title, category, district)`**: Dynamic client-side SVG data-URI generator providing 0-byte offline vector backdrops for circuit passes and network blackout zones.



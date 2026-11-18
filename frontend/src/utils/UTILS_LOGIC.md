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

## 2. Offline Crowd Analytics Engine (`offlineCrowdEngine.js`)

Implements academic queueing theory and stochastic arrival models in pure JavaScript, executing in **0ms** with zero server requests.

### Mathematical Formulations

#### 1. Non-Homogeneous Poisson Process (NHPP)
Arrival rate $\lambda(t)$ varies continuously across the diurnal cycle with Gaussian bell-curve surges centered around peak hours:
$$\lambda(t) = \lambda_{\text{base}} + (\lambda_{\text{peak}} - \lambda_{\text{base}}) \cdot \exp\left(-\frac{(t - \mu_{\text{peak}})^2}{2\sigma^2}\right) \cdot \omega_{\text{day}} \cdot M_{\text{event}}$$
- $\mu_{\text{peak}}$: Centroid of peak surge window (e.g. 11.5 for morning temples, 17.0 for beaches/forts).
- $\sigma$: Spread of peak surge window ($\sigma = 2.4\,\text{hours}$).
- $\omega_{\text{day}}$: Day-of-week multiplier (Saturday/Sunday: 1.45x, Friday: 1.15x, Weekdays: 0.85x).
- $M_{\text{event}}$: Active festival multiplier.

#### 2. Regional Festival & Hydrological Calendar ($M_{\text{event}}$)
- **Maha Shivaratri (Feb / March)**:
  - Kotappakonda Trikoteswara: **15.0x** (10-Lakh pilgrimage congregation, 100-ft electrified Prabhalu).
  - Srisailam, Guthikonda, Vemulawada: **4.5x**.
- **Karthika Masam (Nov / Dec)**:
  - Sacred lighting and deepotsavam pilgrimages: **2.8x**.
- **Monsoon Waterfalls & Dam Hydrology (July - Oct)**:
  - Kuntala, Bogatha, Ethipothala, Nagarjuna Sagar crest gates: **3.5x** peak flood inflow; drops to **0.35x** in dry summer months (April - May).
- **Tirupati Srivari Brahmotsavams (Sept / Oct)**: **3.8x** surge.
- **Sammakka Saralamma Medaram Jathara (Jan / Feb)**: **12.0x** mega tribal pilgrimage.
- **Bonalu & Golconda Monsoon (July / Aug)**: **2.5x** heritage crowd surge.

#### 3. Kingman's Heavy-Traffic Queuing Approximation
Estimates physical ticket counter queue wait times ($W_q$):
$$W_q \approx \frac{\rho}{1 - \rho} \cdot \frac{C_a^2 + C_s^2}{2} \cdot \frac{1}{\mu}$$
- $\rho = \frac{\lambda}{c \cdot \mu}$: Traffic intensity / server utilization.
- $C_a^2, C_s^2$: Coefficients of variation for inter-arrival and service distributions.
- Demonstrates Globetrotter fast-track QR bypass savings by comparing physical wait time $W_q$ against instant turnstile check-in ($< 5\,\text{seconds}$).

#### 4. Client-Side Guide Cache (`setCachedGuide`, `getCachedGuide`)
Stores serialized guide responses in browser storage to provide full offline guidebook access in remote areas without data signal.

---

## 3. Authentic Photo & Offline Banner Engine (`authenticPlacePhotos.js`)

Consolidates all photographic resolution and zero-network fallback logic:
1. **`EXACT_PLACE_PHOTOS`**: Curated dictionary mapping normalized place keys to verified local custodian photographs.
2. **`getAuthenticPlacePhoto(placeOrName)`**: Resolves verified local photography with zero false positives. Returns `null` if unverified so the card displays a clean blank state rather than fake stock images.
3. **`getOfflineImageFallback(title, category, district)`**: Dynamic client-side SVG data-URI generator providing 0-byte offline vector backdrops for circuit passes and network blackout zones.

---

## 4. Anti-Bot Proof-of-Work & Client Integrity Engine (`antiBotProofOfWork.js`)

Implements zero-friction client-side computational puzzles (ALTCHA / Hashcash architecture) and passive automation telemetry:
1. **`solvePoWChallenge(challengeToken, difficulty)`**:
   - Searches for an integer nonce such that $\text{SHA-256}(\text{token} \parallel \text{nonce})$ satisfies leading zero requirements.
   - Uses native `window.crypto.subtle.digest("SHA-256", ...)`.
   - Executes in **30–75ms** in non-blocking browser threads.
2. **`collectClientIntegrity()`**:
   - Gathers passive browser signals (`navigator.webdriver`, screen dimensions, plugin lists, hardware concurrency).
   - Generates compact Base64 token sent in `X-Client-Integrity`.
3. **`preWarmAntiBotProof()`**:
   - Asynchronously fetches and solves challenge during idle moments (e.g. page mount, modal open).
   - Stores solved token in cache so subsequent checkout or booking pass creation has **0ms perceived latency**.
4. **`getAntiBotHeaders()`**:
   - Produces `X-PoW-Token` and `X-Client-Integrity` headers for sensitive API endpoints.



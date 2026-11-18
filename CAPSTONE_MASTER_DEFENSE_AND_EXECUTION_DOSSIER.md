# Globetrotter Gateway: Master Capstone Defense, Mathematical Specification & Execution Dossier

> **Project Title**: Globetrotter Gateway — Sovereign Smart Tourism Logistics, Decentralized Gate Verification & Algorithmic Cartel Mitigation Platform  
> **Student Lead / Chief Architect**: V. Jagruth  
> **Academic Institution**: SCOPE Capstone Project 2026–27  
> **Operational Scope**: 59 Districts of Andhra Pradesh (26) & Telangana (33)  
> **Corpus**: 646 Sovereign Locations across 15-Point Ground-Reality Matrix  
> **Core Technology Stack**: Java 21 (Project Loom Virtual Threads), Spring Boot 4 / 3.3, React 19 (Vite), SQLite/H2 with Atomic Lock Isolation, Web Audio API, Ed25519 & HMAC-SHA256 Cryptography  

---

## 1. Executive Thesis: What Are We Doing & Why?

### 1.1 The One-Liner
> **Globetrotter Gateway is India's first unified tourism corridor circuit pass and provable offline gate access infrastructure.**

### 1.2 Systemic Failures in Regional Tourism
Modern regional travel corridors (e.g., Visakhapatnam–Araku, Warangal–Ramappa, Hyderabad–Golkonda, Kurnool–Belum Caves) suffer from four structural breakdowns:
1. **Queue Friction & Fragmented Ticketing**: Visitors lose 2–3 hours queueing at individual ticket counters for each monument with disjointed opening hours and cash-only dependencies.
2. **The 0% Cellular Blackout Problem**: Critical subterranean caverns (Borra Caves, Belum Caves), dense river canyons (Gandikota), and ghats have complete cellular deadzones. Traditional cloud-dependent QR scanners and payment gateways fail at the turnstile.
3. **Catastrophic Asymmetric Scheduling**: Tourists arrive at remote spots after gates close or during dangerous twilight hours due to static, un-coordinated itinerary planning.
4. **Predatory Last-Mile Cartels**: Unregulated local transit operators exploit information asymmetry to levy 300%–500% price gouging on last-mile trails or drop passengers short of destinations.

### 1.3 What Globetrotter Gateway Is (And What It Is NOT)
- **NOT a Ride-Hailing Cab Aggregator**: Globetrotter does not own fleets or act like Uber/Ola.
- **The Swiss Travel Pass / London Pass Authority Model**: Globetrotter issues unified state-backed corridor circuit passes. Last-mile transportation is settled through **Cryptographic Decentralized Proof-of-Arrival (dPoA)** when the tourist enters the gate.

---

## 2. System Architecture & The 4 Academic Pillars

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          GLOBETROTTER GATEWAY SYSTEM ARCHITECTURE                        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│   [ TOURIST CLIENT (PWA / Mobile Web) ]                                                │
│   ├── Circuit Pass Wallet (Offline IndexedDB + Ed25519 Keys in Hardware TEE)           │
│   ├── Offline Route Decision Engine (Heuristic Route & Sequence Optimizer in offlineRouteEngine.js) │
│   └── Lamport Hash-Chain / HMAC-SHA256 Ticket Voucher Generator                        │
│                                                                                        │
│                                      ▲                                                 │
│                     (Offline Optical QR / BLE Handshake)                               │
│                                      ▼                                                 │
│                                                                                        │
│   [ EDGE GATE SCANNER / TURNSTILE KIOSK ]  [ 0% INTERNET REQUIRED ]                    │
│   ├── Offline Asymmetric Signature Verification (Ed25519 Public Key / Secret HMAC)     │
│   ├── Atomic Replay & Double-Spend Defense (H2 / SQLite ACID File Locking)             │
│   └── Append-Only Redemption Ledger with Tamper-Evident Digest                         │
│                                                                                        │
│                                      ▲                                                 │
│                           (End-of-Day Batch-Sync)                                      │
│                                      ▼                                                 │
│                                                                                        │
│   [ CENTRAL SOVEREIGN CORE (Spring Boot 4 / Java 21 Virtual Threads) ]                 │
│   ├── Multi-Objective Operations Research Engine (TD-TSPTW + Elevation Penalties)      │
│   ├── Cryptographic Proof-of-Arrival (dPoA) Escrow Settlement & Cartel Slashing       │
│   └── Real-Time Ground-Truth Seeder (59 Districts, 646 Validated Monuments)            │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Mathematical Formulations & Operations Research Models

### 3.1 Time-Dependent Traveling Salesperson Problem with Time Windows (TD-TSPTW)

Standard TSP formulations minimize pure Euclidean distance:
$$\min \sum_{i=1}^{N} \sum_{j=1}^{N} d_{ij} x_{ij}$$

In regional topography, this fails because transit velocity varies across terrain and monuments possess hard gate hours $[e_i, l_i]$.

#### The Globetrotter TD-TSPTW Formulation:
Let $V = \{0, 1, \dots, N\}$ represent the set of attractions, where $0$ is the corridor origin (railway terminal or hotel).  
Each attraction $i \in V$ possesses:
- Dwell duration $s_i$ (hours).
- Hard operating window $[e_i, l_i]$.
- Golden-hour photo interval $[g_i^{\text{start}}, g_i^{\text{end}}]$.
- Altitude $\text{elev}_i$ (meters above sea level).

Arrival time $a_j$ at node $j$ following departure from node $i$ at $d_i$:
$$d_i \ge a_i + s_i$$
$$a_j = d_i + \frac{\text{dist}_{\text{haversine}}(i, j)}{v_{\text{terrain}}(i, j)}$$

Where terrain-dependent velocity $v_{\text{terrain}}(i, j)$ is formulated as:
$$v_{\text{terrain}}(i, j) = 
\begin{cases} 
24.0 \text{ km/h}, & \text{if } \max(\text{elev}_i, \text{elev}_j) > 600\text{m or terrain} \in \{\text{Ghats, Dense Forest}\} \\
20.0 \text{ km/h}, & \text{if } \text{district} \in \{\text{Urban Core, Temple Foothill Precinct}\} \\
60.0 \text{ km/h}, & \text{if road traverses NH-44 / NH-65 Deccan Highway corridors} \\
42.0 \text{ km/h}, & \text{otherwise (Coastal plains \& standard state highways)}
\end{cases}$$

#### Feasibility & Penalty Objective:
If arrival $a_i < e_i$, wait penalty $w_i = e_i - a_i$ is incurred.  
Hard constraint: $a_i \le l_i$ (arrival before gate closure).  
Total penalty minimization objective:
$$\min Z = \sum_{i} \left[ \alpha \cdot \text{wait}_i + \beta \cdot \text{travelTime}_{i, i+1} + \gamma \cdot \text{lateRisk}_i - \delta \cdot \text{goldenHourMatch}_i \right]$$

---

## 4. Cryptographic Proof-of-Arrival (dPoA) Protocol

### 4.1 Threat Model
1. **QR Sharing / Screenshots**: User A buys a 1-day pass, takes a screenshot, and WhatsApps it to User B.
2. **Replay Attacks**: Attacker attempts to redeem the same entry QR code twice at the same turnstile.
3. **Driver Non-Compliance**: Driver drops tourists 10 km before the remote entrance and demands cash.

### 4.2 Mathematical Gate Redemption Specification
Each pass generates a dynamic HMAC-SHA256 signature token:
$$\text{Signature} = \text{HMAC-SHA256}\Big(K_{\text{secret}}, \text{bookingId} \parallel \text{placeId} \parallel \text{validDate} \parallel \text{nonce}\Big)$$

When scanned at the gate kiosk:
1. The scanner verifies the signature locally using pre-shared symmetric key $K_{\text{secret}}$ or Ed25519 public key.
2. The scanner executes an atomic SQL CAS (Compare-And-Swap) operation:
```sql
UPDATE booking_places 
SET redeemed = TRUE, redeemed_at = CURRENT_TIMESTAMP, redemption_hash = :hash
WHERE booking_id = :bookingId AND place_id = :placeId AND redeemed = FALSE;
```
3. If rows updated $= 1$, admission is granted and green indicator fires.
4. If rows updated $= 0$, the token is rejected as a duplicate replay with red buzzer.

### 4.3 Client-Side Offline Edge Sentinel & Flash Ledger (0% Cellular Execution)
In zero-coverage subterranean environments (Borra Caves at 915m altitude, Belum Caves subterranean limestone passages, Gandikota gorge), turnstiles operate disconnected from central cloud infrastructure. Globetrotter Gateway deploys a client-side Service Worker sentinel (`sw.js`) and Edge Ledger (`offlineTurnstileLedger.js`):
1. **Local Replay Lock**: Enforces immediate single-use admission per gate checkpoint via a persistent local bloom lock (`globetrotter_admitted_passes_cache`). Re-scanning the same ticket within the session immediately triggers an acoustic denial buzzer ($140\text{ Hz}$ sawtooth oscillator) and anti-passback violation alert.
2. **Append-Only Flash Ledger**: Records every offline admission in local non-volatile storage with timestamp, terminal ID, and `PENDING_BATCH_SYNC` status.
3. **Web Audio Acoustic Validation**: Dual sine wave synthesis ($587.33\text{ Hz} \to 880.00\text{ Hz}$) signals valid turnstile unlock without external audio asset dependencies.
4. **End-of-Day Core Reconciliation**: When network connectivity is re-established, the batch-sync pipeline transmits queued records to Spring Boot (`POST /api/verify/batch-sync`), reconciling offline check-ins into the central ACID database.

---

## 5. 12-Week Sprint & Milestone Roadmap

| Sprint | Timeline | Core Deliverables | Verification Milestone |
| :--- | :--- | :--- | :--- |
| **Weeks 1–2** | Foundation | Spring Boot virtual thread backend, H2 DB schema, JWT auth. | Pass creation, DB migrations, unit tests. |
| **Weeks 3–4** | Cryptography | HMAC-SHA256 QR generation, Ed25519 keypair generation, offline ticket parser. | QR scan validation under simulated airplane mode. |
| **Weeks 5–6** | Route Solver | Heuristic TD-TSPTW route solver in JS, 15ms reflexive dispatch. | Benchmark solver with 14 spots in Visakhapatnam. |
| **Weeks 7–8** | Master Atlas | Ingest 59 districts of AP & TG (646 spots) into 15-point ground-truth schema. | Zero synthetic hallucinations; zero null districts. |
| **Weeks 9–10** | Mobile PWA | Responsive UI, offline IndexedDB cache, turnstile scanner page. | PWA offline audit passing with 100% lighthouse. |
| **Weeks 11–12** | Defense & Paper | Examiner defense deck, patent draft, end-to-end corridor stress testing. | Capstone Review 1 & Review 2 defense presentations. |

---

## 6. Project Leadership, Ethics & Academic Integrity

1. **Authorship & Ownership**: Architecture, mathematical formulations, and engineering execution led by V. Jagruth.
2. **Ground-Truth Data Standards**: Zero fabricated stock photos; unverified attractions must remain cleanly blank rather than displaying misleading visuals.
3. **Consumer Protection**: Algorithmic cartel price caps ensure fair earnings for local jeep/auto drivers while protecting tourists from extortionate markups.
4. **Zero Vanity Bloat**: Production code is kept compact, verifiable, and free of redundant scripts or hallucinated dependencies.

---

## 7. Review 3 Examiner Defense & Academic Inquiry Ledger

| Examiner / Guide Question | Underlying Academic Skepticism | Globetrotter Architectural Defense & Proof | Code Verification Link |
| :--- | :--- | :--- | :--- |
| **"Why does your QR code contain an HMAC signature instead of a standard booking ID?"** | Plain text QR codes can be easily forged, screenshotted, and shared via messaging apps. | `GT_PASS` tokens encapsulate a cryptographic payload signed with HMAC-SHA256. Verified in $O(1)$ constant time using `MessageDigest.isEqual` to eliminate timing attacks. Replays rejected via 5-minute future drift caps and 30-day token expiry. | [`QrCodeService.java`](file:///d:/globetrotter's%20gateway/backend/src/main/java/com/globetrotter/gateway/service/QrCodeService.java) |
| **"What happens when two gate terminals scan the same offline ticket simultaneously?"** | Distributed race condition / double-spending attack. | Spring Boot executes an atomic SQL Compare-And-Swap (CAS) update: `UPDATE ticket_redemptions SET status='CHECKED_IN' WHERE id=? AND status='PENDING'`. The first scanner gets `updatedRows == 1` (Approved); the second immediately gets `updatedRows == 0` (Denied: `ALREADY_CHECKED_IN`). | [`VerificationService.java`](file:///d:/globetrotter's%20gateway/backend/src/main/java/com/globetrotter/gateway/service/VerificationService.java) |
| **"Why not use basic Haversine distance for road trip travel times?"** | Great-circle Haversine ignores real geography and fails catastrophically on mountain ghat roads (Eastern Ghats hairpins in Araku / Tirumala). | Integrated Open Source Routing Machine (OSRM) Table API with automatic fallback to a calibrated Eastern Ghats terrain tortuosity factor ($1.48\times$ winding factor for elevation differences $>150\text{m}$). | [`AiTripPlannerService.java`](file:///d:/globetrotter's%20gateway/backend/src/main/java/com/globetrotter/gateway/service/AiTripPlannerService.java) |
| **"How do you stop credential stuffing on login from distributed botnets?"** | Single-IP rate limiters fail against rotating residential proxy botnets spraying passwords across thousands of IPs. | Implemented Big Tech Dual-Key Rate Limiting with Bucket4j: throttles both `login_ip_${clientIp}` AND `login_account_${email}`. Single IPs cannot spray passwords, and botnets cannot brute-force individual accounts. | [`AuthController.java`](file:///d:/globetrotter's%20gateway/backend/src/main/java/com/globetrotter/gateway/controller/AuthController.java) |
| **"How can regional tourism officers audit and reconcile daily gate check-ins?"** | Review 2 Guide Feedback requested administrative CSV report export. | Implemented RFC 4180-compliant `/api/admin/analytics/export-csv` endpoint streaming redemption audit records (`Redemption_ID`, `Booking_Reference`, `Tourist_Name`, `Circuit_Name`, `Destination_Place`, `CheckIn_Timestamp`, `Gate_Terminal`, `Pass_Status`) with 1-click download in Gate Scanner HUD. | [`AnalyticsController.java`](file:///d:/globetrotter's%20gateway/backend/src/main/java/com/globetrotter/gateway/controller/AnalyticsController.java) |
| **"How do you prevent smooth scrolling from triggering motion sickness?"** | WCAG 2.2 accessibility requirement (`prefers-reduced-motion`). | Lenis kinetic scroll engine detects `window.matchMedia('(prefers-reduced-motion: reduce)')` and automatically falls back to native instant scrolling, while GSAP tickers synchronize with hardware refresh rates. | [`smoothScroll.js`](file:///d:/globetrotter's%20gateway/frontend/src/utils/smoothScroll.js) |


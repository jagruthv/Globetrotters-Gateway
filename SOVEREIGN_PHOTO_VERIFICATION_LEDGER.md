# Sovereign Photo Verification Ledger & Tourism Platforms Directory
## Andhra Pradesh (26 Districts) & Telangana (33 Districts)

> **Platform**: Globetrotter Gateway Master Intelligence  
> **Strict Ground-Truth Rule**: Only authentic, custodian-verified photographs are mapped to attraction cards. Unverified spots remain cleanly blank without misleading stock art.  
> **Total Registered Locations**: 646 across 59 Districts  
> **Official Candidates Harvested**: 354 Local Photographs  
> **Verified & Hydrated Spots**: 167 Locations  

---

## 1. Apex Custodian & Tourism Platforms Directory

### A. Apex Government State Tourism Corporations
1. **Andhra Pradesh Tourism Development Corporation (APTDC)**
   - **Portals**: `https://tourism.ap.gov.in` | `https://aptdc.gov.in`
   - **Scope**: Apex custodian for Andhra Pradesh resorts (Haritha hotels), waterfront cruises, sound & light shows, and official regional tour circuits across all 26 districts.
2. **Telangana State Tourism Development Corporation (TSTDC)**
   - **Portals**: `https://telanganatourism.gov.in` | `https://tstdc.in`
   - **Scope**: Apex custodian for Telangana heritage circuits, Haritha lake resorts, jungle camps (Tadvai, Laknavaram), and state tour packages across all 33 districts.
3. **Incredible India (Ministry of Tourism, Govt of India)**
   - **Portal**: `https://www.incredibleindia.gov.in`
   - **Scope**: National tourism repository featuring high-resolution photography of UNESCO World Heritage sites (Ramappa), Buddhist heritage corridors (Amaravathi, Nagarjunakonda), and iconic monuments.

### B. Temple Trust & Endowments Boards (Pilgrimage Custodians)
4. **Tirumala Tirupati Devasthanams (TTD)**
   - **Portal**: `https://tirupatibalaji.ap.gov.in`
   - **Scope**: Srivari Venkateswara Swamy Temple, Tirumala sacred hills, Kapila Theertham, Sri Padmavathi Ammavaru (Tiruchanur), and sub-shrines.
5. **Andhra Pradesh Endowments Department (Dharmika Parishad)**
   - **Portal**: `https://aptemples.ap.gov.in`
   - **Scope**: Srisailam Bhramaramba Mallikarjuna Swamy (Jyotirlinga & Shakti Peetham), Vijayawada Kanaka Durga, Simhachalam, Srikalahasti, Annavaram, Dwaraka Tirumala, Mahanandi, Ahobilam 9 Narasimha Kshetras.
6. **Telangana State Endowments Department**
   - **Portal**: `https://temple.telangana.gov.in`
   - **Scope**: Yadagirigutta Sri Lakshmi Narasimha Swamy, Vemulawada Raja Rajeshwara Swamy, Basara Gnana Saraswati, Bhadrachalam Sita Ramachandra Swamy, Kondagattu Anjaneya Swamy, Kaleshwaram, Dharmapuri.

### C. Archaeological & Sovereign Heritage Custodians
7. **Archaeological Survey of India (ASI) — Hyderabad & Amaravathi Circles**
   - **Portals**: `https://asi.nic.in` | `https://asihyderabadcircle.nic.in` | `https://asiamravaticircle.nic.in`
   - **Scope**: Ramappa Temple (UNESCO), Charminar, Golconda Fort, Qutb Shahi Tombs, Warangal Fort, Nagarjunakonda Buddhist Island, Amaravathi Mahachaitya, Chandragiri Palaces, Gooty Fort, Gandikota.

### D. District Collectorates & NIC S3WaaS Platforms
8. **59 District Administration Portals (NIC S3WaaS)**
   - **AP (26 Districts)**: `allurisitharamaraju.ap.gov.in`, `visakhapatnam.ap.gov.in`, `tirupati.ap.gov.in`, `kurnool.ap.gov.in`, etc.
   - **TG (33 Districts)**: `hyderabad.telangana.gov.in`, `warangal.telangana.gov.in`, `bhadradri.telangana.gov.in`, etc.
   - **Asset CDN**: `cdn.s3waas.gov.in` — Uncompressed collectorate landscape photography.

---

## 2. Ingested Photography Inventory & Coverage

| District Hub | Source Platform | Coverage & Asset Type | Status |
| :--- | :--- | :--- | :--- |
| **Visakhapatnam** | APTDC & Local Portals | Submarine Museum, Kailasagiri, RK Beach, Rushikonda, Simhachalam | 14 / 14 Verified |
| **Alluri Sitharama Raju** | S3WaaS & Forest Department | Araku Tribal Museum, Borra Caves, Chaparai, Padmapuram | Verified & Linked |
| **Hyderabad** | Incredible India & ASI | Charminar, Golconda, Salar Jung, Chowmahalla, Birla Mandir | Verified & Linked |
| **Hanumakonda & Warangal** | ASI & TSTDC | Thousand Pillar Temple, Warangal Fort, Bhadrakali Temple | Verified & Linked |
| **Mulugu** | ASI Hyderabad Circle | Ramappa Temple (UNESCO World Heritage), Laknavaram Lake | Verified & Linked |
| **Tirupati** | TTD & ASI | Tirumala, Chandragiri Fort, Kapila Theertham, Silathoranam | Verified & Linked |
| **Kurnool & Nandyal** | Endowments & APTDC | Belum Caves, Konda Reddy Buruju, Yaganti, Mahanandi, Ahobilam | Verified & Linked |
| **YSR Kadapa** | APTDC & ASI | Gandikota Grand Canyon, Vontimitta Kodandarama Temple | Verified & Linked |
| **Remaining 51 Districts** | S3WaaS Collectorates & Commons | Curated local photography hydrated for verified landmarks; unverified micro-spots kept blank | Compliant |

---

## 3. Multimodal GitHub Copilot Vision Verification Architecture

```
+-------------------------------------------------------------+
|                     VS Code OAuth Client                    |
|             (Client ID: Iv1.b507a08c87ecfe98)               |
+------------------------------+------------------------------+
                               | 1. Device Code Request
                               v
                https://github.com/login/device
                               | 2. User Approval (In-Browser)
                               v
              OAuth Access Token (read:user)
                               | 3. Exchange Session
                               v
         https://api.github.com/copilot_internal/v2/token
                               | 4. Temporary Copilot Session Bearer
                               v
      https://api.githubcopilot.com/chat/completions (GPT-4o)
            [Multimodal Vision: Base64 JPEG + Prompt]
```

### Vision Audit Verification Schema
Each candidate image evaluated by Copilot Vision must return:
```json
{
  "score": 9.4,
  "landmark_match": true,
  "verdict": "APPROVED",
  "resemblance": "Authentic architectural facade with distinctive spire geometry.",
  "lighting_and_clarity": "High-contrast daylight capture, crisp masonry edges.",
  "feedback": "Production-ready sovereign monument capture."
}
```
Only candidates with `verdict == "APPROVED"` and `score >= 7.5` are hydrated into `authenticPlacePhotos.js` and `atlas_places.json`.

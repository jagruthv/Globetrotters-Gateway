---
name: tourism-corridor-intelligence
description: Provides deep domain knowledge, ground-truth data schemas, optimization algorithms, and academic defense guidance for the Globetrotter Gateway smart tourism platform across Andhra Pradesh and Telangana.
---

# Tourism Corridor Intelligence & Capstone Engineering Skill

This skill equips agents with domain-specific architecture, cryptographic standards, routing formulations, and data schemas for **Globetrotter Gateway**.

## 1. Core Platform Knowledge
- **Coverage**: 59 Districts (26 in Andhra Pradesh, 33 in Telangana), 646 verified tourism destinations.
- **Data Standard**: 15-Point Ground-Reality Dossier (Google Place IDs, Dynastic Origin, Elevation, Checkpost Curfews, Cellular Dead Zones, Sanitation, Last-Mile Transit, Dwell Times).
- **Core Pillars**:
  1. Topographic Itinerary Optimization (TD-TOPTW with elevation & golden hours).
  2. Offline Deterministic Route Engine (Fast client-side corridor detour & tour recommendation via offlineRouteEngine.js).
  3. Provable Offline Gate Security (Cryptographic HMAC-SHA256 signature tokens + offline camera QR reconciliation with atomic CAS anti-passback).
  4. Dynamic Queue & Crowd Modeling (Inhomogeneous Poisson Process with Diurnal Gaussian Intensity).

## 2. Key Project Files
- **Master Index**: [`MASTER_SYSTEM_ARCHITECTURE_AND_GROUND_TRUTH_INDEX.md`](file:///d:/globetrotter's%20gateway/MASTER_SYSTEM_ARCHITECTURE_AND_GROUND_TRUTH_INDEX.md)
- **Master Capstone Dossier**: [`CAPSTONE_MASTER_DEFENSE_AND_EXECUTION_DOSSIER.md`](file:///d:/globetrotter's%20gateway/CAPSTONE_MASTER_DEFENSE_AND_EXECUTION_DOSSIER.md)
- **Sovereign Tourism Atlas**: [`MASTER_59_DISTRICT_TOURISM_ATLAS.md`](file:///d:/globetrotter's%20gateway/MASTER_59_DISTRICT_TOURISM_ATLAS.md)
- **Photo Verification Ledger**: [`SOVEREIGN_PHOTO_VERIFICATION_LEDGER.md`](file:///d:/globetrotter's%20gateway/SOVEREIGN_PHOTO_VERIFICATION_LEDGER.md)
- **Backend Services**: `backend/src/main/java/com/globetrotter/gateway/service/`
- **Frontend Core**: `frontend/src/utils/offlineRouteEngine.js`, `frontend/src/components/AiFluidTripStudio.jsx`

## 3. Engineering Guidelines
- When modifying routing, prefer true road distance models (OSRM/Valhalla) over straight-line Haversine.
- Gate security implements HMAC-SHA256 signature tokens (`GT_PASS:payload:sig`) with atomic SQL CAS updates; keep symmetric secrets restricted to server environment properties.
- Always preserve the 15-point ground reality attributes in any database or data compiler modifications.
- Leverage **OpenSERP** (`http://localhost:7000`) and local `sentence-transformers` for real-time district verification and local semantic search without external cloud token burn.

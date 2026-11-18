# Backend Configuration — Logic Audit & Implementation Status

This document provides a factual, code-verified audit of configurations and initializers in `com.globetrotter.gateway.config` and `src/main/resources`.

---

## 1. DataInitializer
- **File**: `DataInitializer.java`
- **Implemented Logic**:
  - Implements `CommandLineRunner`.
  - Checks if database has any existing users (`userRepository.count() > 0`). If yes, skips execution idempotently.
  - Seeds 3 standard accounts:
    - Admin: `admin@globetrotter.com` / `admin123` (`ROLE_ADMIN`)
    - Staff: `staff@globetrotter.com` / `staff123` (`ROLE_STAFF`)
    - Tourist: `tourist@globetrotter.com` / `tourist123` (`ROLE_TOURIST`)
  - Seeds 6 Visakhapatnam regional attractions with coordinates, hours, fees, and photos:
    - Kailasagiri Hilltop Park
    - Ramakrishna (RK) Beach
    - INS Kurusura Submarine Museum
    - TU-142 Aircraft Museum
    - Borra Caves
    - Katiki Waterfalls
  - Seeds 2 packaged circuits with sequence orders and transit notes:
    - "Vizag Heritage & Coastal Circuit" (4 places, ₹299 vs ₹420 base price)
    - "Araku Valley Nature & Cave Explorer" (2 places, ₹199 vs ₹260 base price)
  - Seeds 1 pre-activated demo pass for `tourist@globetrotter.com` valid today for 3 days.
- **Not Yet Implemented / Gaps**:
  - No database migration tool (Liquibase or Flyway) is used; schema relies on Hibernate `ddl-auto: update`.
  - Image URLs point to external Unsplash assets; if internet is unavailable, images won't render.

---

## 2. AtlasDataSeeder
- **File**: `AtlasDataSeeder.java`
- **Execution Order**: `@Order(2)` (Runs immediately following `DataInitializer`).
- **Implemented Logic**:
  - Ingests `data/atlas_places.json` containing the exhaustive 59-district ground-truth atlas (646 attractions across Andhra Pradesh and Telangana).
  - Validates and performs non-destructive synchronization with H2 / MySQL:
    - If place exists (by unique `slug`), enriches missing ground-truth attributes (`googlePlaceId`, `googleMapsUri`, `cellularCoverage`, `checkpostCurfew`, `sanitationFacility`, `culinarySpecialty`, `emergencyMedicalDistance`, `travelerCompatibility`, `typicalDwellTime`, `historicalSignificance`, `sensoryAtmosphere`, `nearestRailwayTransit`, `stepsAndTerrainEffort`, `giArtisanCraft`, `hazardsAndScamAlerts`) without overwriting custom modifications.
    - If place is new, saves entity with calculated budget (`totalEstimatedCost = entry + parking/2 + lastMile`).
  - Idempotent and transaction-managed (`@Transactional`).
- **Not Yet Implemented / Gaps**:
  - Background async loading for huge JSON files (>10MB).

---

## 3. GlobalExceptionHandler
- **File**: `GlobalExceptionHandler.java`
- **Implemented Logic**:
  - Catches `MethodArgumentNotValidException` (400) and formats validation errors into a single string.
  - Catches `IllegalArgumentException` (400) used for business validation & entity not-found exceptions.
  - Catches `BadCredentialsException` (401) for authentication failures.
  - Catches `AccessDeniedException` (403) for RBAC violations.
  - Catches `Exception` (500) as a catch-all, logging the error and returning a clean JSON error response without leaking stack traces.
- **Not Yet Implemented / Gaps**:
  - No custom business exception hierarchy (e.g. `BookingNotFoundException`, `PassExpiredException`, `GateRedemptionException`); all service-level errors rely on `IllegalArgumentException`.

---

## 4. Database & Runtime Profiles
- **Files**: `application.yml`, `application-mysql.yml`
- **Implemented Logic**:
  - Default profile: File-backed H2 database `./data/globetrotter_dev` with auto-reconnect.
  - MySQL profile: Production-ready configuration for MySQL 8 (`jdbc:mysql://localhost:3306/globetrotter_db`) with `HikariCP` connection pool tuning (max 20, min 5 idle, 3s timeout).
  - Virtual Threads: Java 21 Project Loom virtual threads enabled (`spring.threads.virtual.enabled: true`).
  - Caching: Caffeine in-memory cache configured with max 200 items, 10-minute write expiration.
  - Gzip compression: JSON payloads > 1024 bytes compressed automatically.
  - Actuator endpoints exposed: health, info, metrics, caches.
- **Not Yet Implemented / Gaps**:
  - Externalized secrets: Sensitive keys (Razorpay Secret, JWT Secret, Mail password) fall back to demo defaults when environment variables are omitted.

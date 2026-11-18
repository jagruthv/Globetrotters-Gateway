# Backend Repositories — Logic Audit & Implementation Status

This document provides a factual, code-verified audit of all 7 Spring Data JPA repositories in `com.globetrotter.gateway.repository`.

---

## 1. BookingRepository
- **File**: `BookingRepository.java`
- **Queries & Logic**:
  - `findByBookingReference(String)`: Used during checkout confirmation, detail lookup, and fallback gate scanning.
  - `findByQrPassToken(String)`: Primary query to resolve bookings during gate QR scanning.
  - `findByUserIdOrderByCreatedAtDesc(Long)` & `findByUserEmailOrderByCreatedAtDesc(String)`: Retrieves user passes in chronological order.
  - `@Query countTotalBookings()`: Counts total bookings for admin analytics.
  - `@Query calculateTotalRevenue()`: Computes total monetary revenue summing `b.totalAmount` for `CONFIRMED` or `PAID` records using `COALESCE(SUM(...), 0)`.
- **Not Yet Implemented / Gaps**:
  - No paginated query for all bookings (admin cannot browse historical bookings with pagination).

---

## 2. TicketRedemptionRepository
- **File**: `TicketRedemptionRepository.java`
- **Queries & Logic**:
  - `findByBookingIdAndPlaceId(Long, Long)`: Retrieves the specific redemption slot for an attraction.
  - `findByBookingId(Long)`: Retrieves all redemption slots for a booking.
  - `@Query countTotalCheckIns()`: Total count where `status = 'CHECKED_IN'`.
  - `@Query countCheckInsSince(LocalDateTime)`: Counts today's check-ins since midnight.
  - `@Query findCheckInsByPlace()`: Groups check-in counts by attraction name for popularity ranking.
  - `checkInAtomically(id, now, staff, terminal)`:
    - Custom `@Modifying` update: `UPDATE TicketRedemption tr SET tr.status = 'CHECKED_IN', tr.checkedInAt = :now, tr.verifiedByStaffUsername = :staff, tr.gateTerminalId = :terminal WHERE tr.id = :id AND tr.status = 'PENDING'`
    - Prevents double-check-in race conditions across concurrent scanners.
  - `findRecentCheckInsWithDetails(Pageable)`:
    - Optimized JPQL join fetch: `SELECT tr FROM TicketRedemption tr JOIN FETCH tr.booking b JOIN FETCH b.user JOIN FETCH b.circuit JOIN FETCH tr.place WHERE tr.status = 'CHECKED_IN' ORDER BY tr.checkedInAt DESC`
    - Resolves recent scans without N+1 query overhead.
- **Not Yet Implemented / Gaps**:
  - No check-out or exit recording query.

---

## 3. CircuitRepository
- **File**: `CircuitRepository.java`
- **Queries & Logic**:
  - `findByActiveTrue()`: Lists active catalog entries for public views.
  - `findByActiveTrueAndFeaturedTrue()`: Lists featured circuits for homepage.
  - `findBySlug(String)`: Friendly URL lookup.
  - `findByStateIgnoreCaseAndIsActiveTrueOrderByDisplayOrderAsc(String)`: Regional state-filtered circuit queries.
- **Not Yet Implemented / Gaps**:
  - No full-text search index (searches rely on exact slug/category or in-memory filtering).

---

## 4. PlaceRepository
- **File**: `PlaceRepository.java`
- **Queries & Logic**:
  - `findByActiveTrue()`: Lists all active attractions (cached for scanner dropdown & map views).
  - `findBySlug(String)`: Friendly unique URL slug lookup.
  - `findByCategoryIgnoreCase(String)`: Filters attractions by category (e.g. "Heritage", "Nature", "Temple").
  - `findByDistrictIgnoreCase(String)`: Essential 59-district atlas queries (e.g. "Alluri Sitharama Raju (ASR) District", "Hanumakonda District").
  - `findByStateIgnoreCase(String)`: State-wide attraction grouping ("Andhra Pradesh", "Telangana").
  - `findByCityIgnoreCase(String)`: City-level attraction aggregation.
- **Not Yet Implemented / Gaps**:
  - Geospatial query optimization (PostGIS / Spatial queries) for bounding box polygon searches.

---

## 5. UserRepository, CircuitPlaceRepository, ChatMessageRepository
- **Files**: `UserRepository.java`, `CircuitPlaceRepository.java`, `ChatMessageRepository.java`
- **Queries & Logic**:
  - `findByEmail(String)` & `existsByEmail(String)`: Core authentication and registration checks.
  - `findByCircuitIdOrderBySequenceOrderAsc(Long)`: Orders attractions in an itinerary.
  - `findBySessionIdOrderByTimestampAsc(String)`: Loads conversation dialogue in sequence.
- **Not Yet Implemented / Gaps**:
  - No chat message retention/pruning query (transcripts persist indefinitely).

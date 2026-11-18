package com.globetrotter.gateway.repository;

import com.globetrotter.gateway.model.TicketRedemption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TicketRedemptionRepository extends JpaRepository<TicketRedemption, Long> {
    Optional<TicketRedemption> findByBookingIdAndPlaceId(Long bookingId, Long placeId);
    List<TicketRedemption> findByBookingId(Long bookingId);

    @Query("SELECT COUNT(tr) FROM TicketRedemption tr WHERE tr.status = 'CHECKED_IN'")
    long countTotalCheckIns();

    @Query("SELECT COUNT(tr) FROM TicketRedemption tr WHERE tr.status = 'CHECKED_IN' AND tr.checkedInAt >= :since")
    long countCheckInsSince(LocalDateTime since);

    @Query("SELECT tr.place.name, COUNT(tr) FROM TicketRedemption tr WHERE tr.status = 'CHECKED_IN' GROUP BY tr.place.name")
    List<Object[]> findCheckInsByPlace();

    /**
     * Atomic check-in — returns 1 if row was updated from PENDING to CHECKED_IN.
     * Returns 0 if already checked in or if another concurrent scan won the race.
     * Guaranteed safe under massive concurrent gate traffic.
     */
    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE TicketRedemption tr SET tr.status = 'CHECKED_IN', tr.checkedInAt = :now, tr.verifiedByStaffUsername = :staff, tr.gateTerminalId = :terminal WHERE tr.id = :id AND tr.status = 'PENDING'")
    int checkInAtomically(
            @org.springframework.data.repository.query.Param("id") Long id,
            @org.springframework.data.repository.query.Param("now") LocalDateTime now,
            @org.springframework.data.repository.query.Param("staff") String staff,
            @org.springframework.data.repository.query.Param("terminal") String terminal
    );

    /**
     * Single-query fetch for analytics recent check-in feed.
     * Eliminates N+1 queries by eager-fetching booking, user, circuit, and place in 1 query.
     */
    @Query("SELECT tr FROM TicketRedemption tr JOIN FETCH tr.booking b JOIN FETCH b.user JOIN FETCH b.circuit JOIN FETCH tr.place WHERE tr.status = 'CHECKED_IN' ORDER BY tr.checkedInAt DESC")
    List<TicketRedemption> findRecentCheckInsWithDetails(org.springframework.data.domain.Pageable pageable);
}

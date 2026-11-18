package com.globetrotter.gateway.repository;

import com.globetrotter.gateway.model.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    Optional<Booking> findByBookingReference(String bookingReference);
    Optional<Booking> findByQrPassToken(String qrPassToken);
    List<Booking> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Booking> findByUserEmailOrderByCreatedAtDesc(String email);

    @Query("SELECT COUNT(b) FROM Booking b")
    long countTotalBookings();

    @Query("SELECT COALESCE(SUM(b.totalAmount), 0) FROM Booking b WHERE b.paymentStatus = 'CONFIRMED' OR b.paymentStatus = 'PAID'")
    BigDecimal calculateTotalRevenue();
}

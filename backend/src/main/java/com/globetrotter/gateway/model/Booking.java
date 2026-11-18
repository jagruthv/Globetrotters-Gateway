package com.globetrotter.gateway.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
    name = "bookings",
    indexes = {
        @Index(name = "idx_booking_ref", columnList = "bookingReference"),
        @Index(name = "idx_booking_user", columnList = "user_id"),
        @Index(name = "idx_booking_circuit", columnList = "circuit_id"),
        @Index(name = "idx_booking_status", columnList = "paymentStatus"),
        @Index(name = "idx_booking_created", columnList = "createdAt"),
        @Index(name = "idx_booking_razorpay_order", columnList = "razorpayOrderId"),
        @Index(name = "idx_booking_qr_token", columnList = "qrPassToken")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String bookingReference; // e.g. GT-A3F7B2C1

    // LAZY: only load user when explicitly accessed (prevents N+1 on booking lists)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // LAZY: only load circuit when explicitly accessed
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "circuit_id", nullable = false)
    private Circuit circuit;

    @Column(nullable = false)
    private BigDecimal totalAmount;

    @Column(nullable = false)
    private Integer numberOfTourists;

    @Column(nullable = false)
    private LocalDate visitStartDate;

    @Column(nullable = false)
    private LocalDate visitEndDate;

    @Column(nullable = false)
    private String paymentStatus; // "PENDING" | "PAID" | "FAILED" | "REFUNDED"

    // Internal only — HMAC-signed verifiable token. Never returned in API responses.
    @Column(unique = true, nullable = false, length = 512)
    private String qrPassToken;

    // Razorpay order ID — stored to verify payment callback
    @Column(length = 100)
    private String razorpayOrderId;

    // Razorpay payment ID — set after successful payment verification
    @Column(length = 100)
    private String razorpayPaymentId;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    @Builder.Default
    private List<TicketRedemption> redemptions = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.paymentStatus == null) {
            this.paymentStatus = "PENDING"; // Default to PENDING — payment required before QR is active
        }
    }
}


package com.globetrotter.gateway.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "ticket_redemptions",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_booking_place", columnNames = {"booking_id", "place_id"})
    },
    indexes = {
        @Index(name = "idx_redemption_status", columnList = "status"),
        @Index(name = "idx_redemption_checked_in", columnList = "checkedInAt")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TicketRedemption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    @JsonBackReference
    private Booking booking;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "place_id", nullable = false)
    private Place place;

    @Column(nullable = false)
    @Builder.Default
    private String status = "PENDING"; // "PENDING", "CHECKED_IN", "EXPIRED"

    private LocalDateTime checkedInAt;

    private String verifiedByStaffUsername;

    private String gateTerminalId;
}

package com.globetrotter.gateway.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.Instant;

@Entity
@Table(
    name = "pass_locations",
    uniqueConstraints = {
        @UniqueConstraint(name = "idx_pass_location_lookup", columnNames = {"pass_id", "location_id"})
    },
    indexes = {
        @Index(name = "idx_pass_loc_status", columnList = "status"),
        @Index(name = "idx_pass_loc_location", columnList = "location_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PassLocation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pass_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JsonBackReference
    private CircuitPass pass;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "location_id", nullable = false)
    private Place location;

    @Column(nullable = false)
    private int guestCount;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "UNUSED"; // UNUSED, REDEEMED, CANCELLED

    private Instant redeemedAt;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "redeemed_by_agent_id")
    private User redeemedByAgent;

    @PrePersist
    protected void onCreate() {
        if (this.status == null) {
            this.status = "UNUSED";
        }
        if (this.guestCount <= 0) {
            this.guestCount = 1;
        }
    }
}

package com.globetrotter.gateway.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(
    name = "scan_audit_logs",
    indexes = {
        @Index(name = "idx_scan_audit_pass", columnList = "passId"),
        @Index(name = "idx_scan_audit_loc", columnList = "locationId"),
        @Index(name = "idx_scan_audit_agent", columnList = "agentId"),
        @Index(name = "idx_scan_audit_time", columnList = "scannedAt")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScanAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 32)
    private String passId;

    @Column(nullable = false)
    private Long locationId;

    @Column(nullable = false)
    private Long agentId;

    @Column(nullable = false, length = 32)
    private String result; // SUCCESS, INVALID_FORMAT, INVALID_SIGNATURE, PASS_EXPIRED, PASS_REVOKED, NOT_BOOKED_HERE, ALREADY_REDEEMED

    @Column(nullable = false, updatable = false)
    private Instant scannedAt;

    @PrePersist
    protected void onCreate() {
        if (this.scannedAt == null) {
            this.scannedAt = Instant.now();
        }
    }
}

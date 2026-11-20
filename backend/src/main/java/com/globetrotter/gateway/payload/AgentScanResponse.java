package com.globetrotter.gateway.payload;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentScanResponse {

    private String status; // SUCCESS, ALREADY_REDEEMED, NOT_BOOKED_HERE, PASS_EXPIRED, PASS_REVOKED, INVALID_FORMAT, INVALID_SIGNATURE
    private String message;
    private String passId;
    private Long locationId;
    private String locationName;
    private int guestCount;
    private String touristName;
    private Instant redeemedAt;
    private Instant validUntil;
}

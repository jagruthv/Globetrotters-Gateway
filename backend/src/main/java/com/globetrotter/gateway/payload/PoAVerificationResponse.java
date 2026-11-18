package com.globetrotter.gateway.payload;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoAVerificationResponse {
    private boolean valid;
    private String status;               // "AUTHORIZED_STATUTORY_FARE_CAP", "TOKEN_EXPIRED", "SIGNATURE_INVALID", "PLACE_NOT_FOUND"
    private Long placeId;
    private String placeName;
    private String mandal;
    private String district;
    private String state;
    private String touristName;
    private BigDecimal statutoryFareCap;  // e.g. 200.00
    private String transitType;           // e.g. "Local Tribal Committee 4x4 Jeep + 2.5km Trek"
    private Instant issuedAt;
    private Instant expiresAt;
    private String committeeBylawClause;
    private String legalNotice;
}

package com.globetrotter.gateway.payload;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoATokenRequest {
    private Long bookingId;

    @NotNull(message = "Place ID is mandatory for Proof-of-Arrival token generation")
    private Long placeId;

    private String touristName;
    private BigDecimal customizedFareCap;
    private Integer validityMinutes; // Default 360 (6 hours)
}

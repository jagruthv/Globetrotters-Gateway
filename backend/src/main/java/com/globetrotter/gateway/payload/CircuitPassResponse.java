package com.globetrotter.gateway.payload;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CircuitPassResponse {

    private String passId;
    private String qrPayload;
    private Instant validFrom;
    private Instant validUntil;
    private String status;
    private String touristName;
    private String touristEmail;
    private List<PassLocationResponseDTO> locations;
}

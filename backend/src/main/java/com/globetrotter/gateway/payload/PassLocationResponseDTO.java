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
public class PassLocationResponseDTO {

    private Long id;
    private Long locationId;
    private String locationName;
    private int guestCount;
    private String status;
    private Instant redeemedAt;
}

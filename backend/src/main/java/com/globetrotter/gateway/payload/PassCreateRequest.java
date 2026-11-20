package com.globetrotter.gateway.payload;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
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
public class PassCreateRequest {

    private Instant validFrom;

    @NotNull(message = "validUntil is required")
    private Instant validUntil;

    @NotEmpty(message = "At least one location must be included")
    private List<PassLocationItemDTO> locations;
}

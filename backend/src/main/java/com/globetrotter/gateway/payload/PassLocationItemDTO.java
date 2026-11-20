package com.globetrotter.gateway.payload;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PassLocationItemDTO {

    @NotNull(message = "locationId is required")
    private Long locationId;

    @Min(value = 1, message = "guestCount must be at least 1")
    @Builder.Default
    private int guestCount = 1;
}

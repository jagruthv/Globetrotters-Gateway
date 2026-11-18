package com.globetrotter.gateway.payload;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class BookingRequest {
    @NotNull
    private Long circuitId;

    @NotNull
    @Min(1)
    private Integer numberOfTourists;

    @NotNull
    @FutureOrPresent
    private LocalDate visitStartDate;
}

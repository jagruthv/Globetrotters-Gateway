package com.globetrotter.gateway.payload;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScanResponse {
    private boolean valid;
    private String status; // "SUCCESS", "ALREADY_CHECKED_IN", "INVALID_PASS", "EXPIRED", "PLACE_NOT_IN_CIRCUIT"
    private String message;
    private String touristName;
    private Integer numberOfTourists;
    private String circuitTitle;
    private String placeName;
    private String bookingReference;
    private LocalDateTime checkedInAt;
}

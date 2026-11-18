package com.globetrotter.gateway.payload;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TripPlanRequest {
    private List<Long> placeIds;
    private List<String> placeNames;
    private String startDate;       // e.g. "2026-10-15"
    private String startTime;       // e.g. "09:00 AM"
    private Integer days;
    private Boolean autoCalculateDays;
    private List<java.util.Map<String, Object>> places;
    private String partyType;       // e.g. "Family with Kids", "Friends", "Solo Explorer", "Senior Citizens"
    private String pace;            // e.g. "Relaxed", "Balanced", "Active"
    private String language;        // e.g. "en", "te", "hi"
}

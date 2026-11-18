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
public class CrowdForecastDTO {
    private Long placeId;
    private String placeName;
    private String targetDay;
    private String targetTime;
    private boolean open;
    private Integer estimatedLiveVisitors;
    private Double capacityPercentage;
    private String crowdStatus; // SERENE, MODERATE, BUSY, PEAK_SURGE
    private Integer ticketCounterWaitMinutes;
    private Integer fastTrackSavedMinutes;
    private String recommendedBestWindow;
    private String peakWindow;
    private List<HourlyBusynessPoint> hourlyBusynessProfile;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HourlyBusynessPoint {
        private int hour;              // 0-23
        private String hourLabel;      // "11:00 AM"
        private int busynessPercent;   // 0-100%
        private int estimatedVisitors; // Estimated concurrent visitors
        private boolean open;          // Whether place is open during this hour
        private boolean currentSlot;   // Whether this point matches targetTime
    }
}

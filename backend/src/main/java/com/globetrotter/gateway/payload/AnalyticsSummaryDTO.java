package com.globetrotter.gateway.payload;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalyticsSummaryDTO {
    private long totalBookings;
    private long totalCheckIns;
    private long activeTouristsToday;
    private BigDecimal totalRevenue;
    private long totalCircuits;
    private long totalPlaces;
    private List<PlaceCheckInStat> placePopularity;
    private List<RecentCheckInDTO> recentCheckIns;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class PlaceCheckInStat {
        private String placeName;
        private long checkIns;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    @Builder
    public static class RecentCheckInDTO {
        private String touristName;
        private String circuitTitle;
        private String placeName;
        private String timestamp;
        private String gateTerminal;
    }
}

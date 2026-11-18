package com.globetrotter.gateway.payload;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlaceGuideDTO {
    private Long id;
    private String name;
    private String slug;
    private String category;
    private String city;
    private String district;
    private String state;
    private String openingTime;
    private String closingTime;
    private BigDecimal individualPrice;
    private String imageUrl;
    private String address;
    private Integer elevationMeters;

    // Logistics & Reality
    private String lastMileTransitType;
    private BigDecimal lastMileCost;
    private BigDecimal parkingFee;
    private Double trekDistanceKm;
    private String physicalDifficulty;
    private String practicalAccessGuide;
    private BigDecimal totalEstimatedCost;

    // Lore & Sensory Guide
    private String backstory;
    private String sensoryAtmosphere;

    // Consumer Protection, Purchases & Ground Truth
    private String authenticPurchases;
    private String scamsAndFakes;
    private String rulesAndHazards;
    private String goldenHour;
    private String feesDescription;
    private String distanceText;

    // Ratings & Social Proof
    private Double averageRating;
    private Integer reviewCount;

    // Footfall & Capacity Metrics
    private Integer peakDailyFootfall;
    private Integer averageDailyFootfall;
    private String peakVisitingSeason;
    private Integer hourlyCapacity;

    // Real-Time Dynamic Crowd Intelligence
    private CrowdForecastDTO liveCrowdCalculation;
}

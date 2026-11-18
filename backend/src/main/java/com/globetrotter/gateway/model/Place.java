package com.globetrotter.gateway.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(
    name = "places",
    indexes = {
        @Index(name = "idx_place_slug", columnList = "slug"),
        @Index(name = "idx_place_category", columnList = "category"),
        @Index(name = "idx_place_state", columnList = "state"),
        @Index(name = "idx_place_active", columnList = "active")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Place {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String category; // e.g., "Heritage", "Beach", "Museum", "Nature", "Temple"

    private String state; // e.g., "Andhra Pradesh", "Rajasthan", "Kerala", "Uttar Pradesh"
    private String district; // e.g., "Alluri Sitharama Raju (ASR) District", "Hyderabad District"
    private String city;  // e.g., "Visakhapatnam", "Araku Valley", "Tirupati", "Jaipur", "Kochi"

    private Double latitude;
    private Double longitude;

    private String openingTime; // e.g. "09:00 AM"
    private String closingTime; // e.g. "06:00 PM"

    private BigDecimal individualPrice;

    @Column(length = 1000)
    private String imageUrl;

    private String address;

    // Scenic & Terrain Attributes for Intelligent Scheduling & Route Decision Engine
    private String bestVisitingHoursStart; // e.g. "06:00 AM", "10:00 AM"
    private String bestVisitingHoursEnd;   // e.g. "08:30 AM", "01:30 PM"
    
    @Column(length = 500)
    private String scenicTip;              // e.g. "Morning sun illuminates the cascade; safe descent before mist."

    private String crowdPeakStart;         // e.g. "12:00 PM"
    private String crowdPeakEnd;           // e.g. "03:00 PM"
    private Integer elevationMeters;       // Elevation in meters above sea level (e.g. 705 for Borra Caves)

    // Ground Reality & Last-Mile Transit Logistics
    private String lastMileTransitType;    // e.g. "Local Tribal Committee 4x4 Jeep + 2.5km Trek", "TSTDC Ferry Boat", "408 Steep Rock-Cut Steps", "Paved Direct Access"
    private BigDecimal lastMileCost;       // e.g. 200.00 (Jeep seat / Ferry fare)
    private BigDecimal parkingFee;         // e.g. 50.00 (Vehicle parking charge)
    private Double trekDistanceKm;         // e.g. 2.5 (Walking/hiking distance from vehicle drop-off)
    private String physicalDifficulty;     // e.g. "STRENUOUS", "MODERATE", "EASY"
    
    @Column(columnDefinition = "TEXT")
    private String practicalAccessGuide;   // Practical visitor instructions: where private cars stop, committee rules, terrain, required footwear, timings

    private BigDecimal totalEstimatedCost; // True per-person budget: entry + parking share + last-mile transfer + essential guide

    @Column(columnDefinition = "TEXT")
    private String backstory;              // Dynastic origins, mythological lore, historical chronicles

    @Column(columnDefinition = "TEXT")
    private String sensoryAtmosphere;      // "How it will be": sensory expectations, sounds, sights, mist, acoustics

    // Consumer Protection, Authentic Purchases & Local Reality
    @Column(columnDefinition = "TEXT")
    private String authenticPurchases;     // Certified local crafts, GI products, staples, fair price points

    @Column(columnDefinition = "TEXT")
    private String scamsAndFakes;          // Ground-truth consumer protection: fake guides, overpriced hawkers, spurious goods

    @Column(columnDefinition = "TEXT")
    private String rulesAndHazards;        // Life-safety warnings, terrain restrictions, photography taboos, sacred customs

    private String goldenHour;             // Best visual and atmospheric window (e.g. "02:30 PM - 05:00 PM (Live Dhimsa dance)")

    private String feesDescription;        // Detailed official price breakdown (Adult, child, camera, parking)

    private String distanceText;           // Exact distance from major transit hubs

    private Double averageRating;          // e.g. 4.7 out of 5.0
    private Integer reviewCount;           // e.g. 48500 verified reviews
    private Integer peakDailyFootfall;     // e.g. 15000 max weekend visitors
    private Integer averageDailyFootfall;  // e.g. 3200 typical weekday visitors
    private String peakVisitingSeason;     // e.g. "October – February (Pleasant winter mist & cascade surge)"
    private Integer hourlyCapacity;        // e.g. 450 safe concurrent visitor capacity

    private String googlePlaceId;          // Official Google Place ID
    @Column(length = 1000)
    private String googleMapsUri;          // Direct Google Maps Navigation URL
    private String cellularCoverage;       // e.g. "Jio 4G / Airtel sporadic; BSNL stable; 12km forest dead zone"
    private String checkpostCurfew;        // e.g. "Forest Checkpost closes 9:00 PM – 6:00 AM; Day entry cutoff 5:00 PM"
    private String sanitationFacility;     // e.g. "APTDC Bio-toilets available; carry own drinking water"
    private String culinarySpecialty;      // e.g. "Authentic Bamboo Chicken & Araku Filter Coffee"
    private String emergencyMedicalDistance; // e.g. "Nearest CHC Government Hospital 18 km at Paderu"
    private String travelerCompatibility;  // e.g. "Family-Friendly, Elderly with Doli, Photography"
    private String typicalDwellTime;       // e.g. "2 to 3 hours"

    @Builder.Default
    private Boolean active = true;
}

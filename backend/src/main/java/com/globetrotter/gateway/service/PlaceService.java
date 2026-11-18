package com.globetrotter.gateway.service;

import com.globetrotter.gateway.model.Place;
import com.globetrotter.gateway.repository.PlaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PlaceService {

    private final PlaceRepository placeRepository;
    private final CrowdAnalyticsService crowdAnalyticsService;

    // Cached: full list of active places (shown in gate scanner dropdown & circuit cards)
    @Cacheable(value = "places", key = "'all'")
    public List<Place> getAllActivePlaces() {
        return placeRepository.findByActiveTrue();
    }

    @Cacheable(value = "places", key = "#id")
    public Optional<Place> getPlaceById(Long id) {
        return placeRepository.findById(id);
    }

    @Cacheable(value = "places", key = "#slug")
    public Optional<Place> getPlaceBySlug(String slug) {
        return placeRepository.findBySlug(slug);
    }

    @Cacheable(value = "places", key = "'cat_' + #category.toLowerCase()")
    public List<Place> getPlacesByCategory(String category) {
        return placeRepository.findByCategoryIgnoreCase(category);
    }

    @Cacheable(value = "places", key = "'dist_' + #district.toLowerCase()")
    public List<Place> getPlacesByDistrict(String district) {
        return placeRepository.findByDistrictIgnoreCase(district);
    }

    public Optional<com.globetrotter.gateway.payload.PlaceGuideDTO> getPlaceGuide(Long id, java.time.DayOfWeek day, java.time.LocalTime time) {
        return placeRepository.findById(id).map(p -> mapToGuideDTO(p, day, time));
    }

    public Optional<com.globetrotter.gateway.payload.PlaceGuideDTO> getPlaceGuideBySlug(String slug, java.time.DayOfWeek day, java.time.LocalTime time) {
        return placeRepository.findBySlug(slug).map(p -> mapToGuideDTO(p, day, time));
    }

    public Optional<com.globetrotter.gateway.payload.CrowdForecastDTO> getCrowdForecast(Long id, java.time.DayOfWeek day, java.time.LocalTime time) {
        return placeRepository.findById(id).map(p -> crowdAnalyticsService.calculateForecast(p, day, time));
    }

    private com.globetrotter.gateway.payload.PlaceGuideDTO mapToGuideDTO(Place p, java.time.DayOfWeek day, java.time.LocalTime time) {
        com.globetrotter.gateway.payload.CrowdForecastDTO forecast = crowdAnalyticsService.calculateForecast(p, day, time);
        return com.globetrotter.gateway.payload.PlaceGuideDTO.builder()
                .id(p.getId())
                .name(p.getName())
                .slug(p.getSlug())
                .category(p.getCategory())
                .city(p.getCity())
                .district(p.getDistrict())
                .state(p.getState())
                .openingTime(p.getOpeningTime())
                .closingTime(p.getClosingTime())
                .individualPrice(p.getIndividualPrice())
                .imageUrl(p.getImageUrl())
                .address(p.getAddress())
                .elevationMeters(p.getElevationMeters())
                .lastMileTransitType(p.getLastMileTransitType())
                .lastMileCost(p.getLastMileCost())
                .parkingFee(p.getParkingFee())
                .trekDistanceKm(p.getTrekDistanceKm())
                .physicalDifficulty(p.getPhysicalDifficulty())
                .practicalAccessGuide(p.getPracticalAccessGuide())
                .totalEstimatedCost(p.getTotalEstimatedCost())
                .backstory(p.getBackstory())
                .sensoryAtmosphere(p.getSensoryAtmosphere())
                .authenticPurchases(p.getAuthenticPurchases())
                .scamsAndFakes(p.getScamsAndFakes())
                .rulesAndHazards(p.getRulesAndHazards())
                .goldenHour(p.getGoldenHour())
                .feesDescription(p.getFeesDescription())
                .distanceText(p.getDistanceText())
                .averageRating(p.getAverageRating() != null ? p.getAverageRating() : null)
                .reviewCount(p.getReviewCount() != null ? p.getReviewCount() : 0)
                .peakDailyFootfall(p.getPeakDailyFootfall())
                .averageDailyFootfall(p.getAverageDailyFootfall())
                .peakVisitingSeason(p.getPeakVisitingSeason())
                .hourlyCapacity(p.getHourlyCapacity())
                .liveCrowdCalculation(forecast)
                .build();
    }

    @Transactional
    @CacheEvict(value = "places", allEntries = true)
    public Place createOrUpdatePlace(Place place) {
        if (place.getSlug() == null || place.getSlug().isBlank()) {
            place.setSlug(place.getName().toLowerCase().replaceAll("[^a-z0-9]+", "-"));
        }
        return placeRepository.save(place);
    }

    @Transactional
    @CacheEvict(value = "places", allEntries = true)
    public void deletePlace(Long id) {
        placeRepository.findById(id).ifPresent(p -> {
            p.setActive(false);
            placeRepository.save(p);
        });
    }
}

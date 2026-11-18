package com.globetrotter.gateway.controller;

import com.globetrotter.gateway.model.Place;
import com.globetrotter.gateway.service.PlaceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/places")
@RequiredArgsConstructor
public class PlaceController {

    private final PlaceService placeService;

    @GetMapping
    public ResponseEntity<List<Place>> getAllPlaces() {
        return ResponseEntity.ok(placeService.getAllActivePlaces());
    }

    @GetMapping("/category/{category}")
    public ResponseEntity<List<Place>> getPlacesByCategory(@PathVariable String category) {
        return ResponseEntity.ok(placeService.getPlacesByCategory(category));
    }

    @GetMapping("/district/{district}")
    public ResponseEntity<List<Place>> getPlacesByDistrict(@PathVariable String district) {
        return ResponseEntity.ok(placeService.getPlacesByDistrict(district));
    }

    @GetMapping("/districts")
    public ResponseEntity<java.util.Map<String, List<String>>> getAllDistricts() {
        List<Place> places = placeService.getAllActivePlaces();
        java.util.Map<String, List<String>> stateDistricts = new java.util.TreeMap<>();
        for (Place p : places) {
            if (p.getState() != null && p.getDistrict() != null && !p.getDistrict().isBlank()) {
                stateDistricts.computeIfAbsent(p.getState(), k -> new java.util.ArrayList<>());
                if (!stateDistricts.get(p.getState()).contains(p.getDistrict())) {
                    stateDistricts.get(p.getState()).add(p.getDistrict());
                }
            }
        }
        for (List<String> dists : stateDistricts.values()) {
            java.util.Collections.sort(dists);
        }
        return ResponseEntity.ok(stateDistricts);
    }

    @GetMapping("/{idOrSlug}")
    public ResponseEntity<Place> getPlace(@PathVariable String idOrSlug) {
        try {
            Long id = Long.parseLong(idOrSlug);
            return placeService.getPlaceById(id)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (NumberFormatException e) {
            return placeService.getPlaceBySlug(idOrSlug)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        }
    }

    @GetMapping("/{idOrSlug}/guide")
    public ResponseEntity<com.globetrotter.gateway.payload.PlaceGuideDTO> getPlaceGuide(
            @PathVariable String idOrSlug,
            @RequestParam(required = false) String day,
            @RequestParam(required = false) String time
    ) {
        java.time.DayOfWeek dayOfWeek = parseDay(day);
        java.time.LocalTime localTime = parseTime(time);

        try {
            Long id = Long.parseLong(idOrSlug);
            return placeService.getPlaceGuide(id, dayOfWeek, localTime)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (NumberFormatException e) {
            return placeService.getPlaceGuideBySlug(idOrSlug, dayOfWeek, localTime)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        }
    }

    @GetMapping("/{id}/crowd-forecast")
    public ResponseEntity<com.globetrotter.gateway.payload.CrowdForecastDTO> getCrowdForecast(
            @PathVariable Long id,
            @RequestParam(required = false) String day,
            @RequestParam(required = false) String time
    ) {
        java.time.DayOfWeek dayOfWeek = parseDay(day);
        java.time.LocalTime localTime = parseTime(time);
        return placeService.getCrowdForecast(id, dayOfWeek, localTime)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    private java.time.DayOfWeek parseDay(String dayStr) {
        if (dayStr == null || dayStr.isBlank()) return java.time.DayOfWeek.SATURDAY;
        try {
            return java.time.DayOfWeek.valueOf(dayStr.trim().toUpperCase());
        } catch (Exception e) {
            return java.time.DayOfWeek.SATURDAY;
        }
    }

    private java.time.LocalTime parseTime(String timeStr) {
        if (timeStr == null || timeStr.isBlank()) return java.time.LocalTime.of(12, 0);
        try {
            return java.time.LocalTime.parse(timeStr.trim());
        } catch (Exception e1) {
            try {
                return java.time.LocalTime.parse(timeStr.trim().toUpperCase(),
                        java.time.format.DateTimeFormatter.ofPattern("hh:mm a", java.util.Locale.ENGLISH));
            } catch (Exception e2) {
                return java.time.LocalTime.of(12, 0);
            }
        }
    }
}

package com.globetrotter.gateway.controller;

import com.globetrotter.gateway.model.Circuit;
import com.globetrotter.gateway.service.CircuitService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/circuits")
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class CircuitController {

    private final CircuitService circuitService;
    private final com.globetrotter.gateway.service.RouteOptimizationService routeOptimizationService;

    @GetMapping
    public ResponseEntity<List<Circuit>> getAllCircuits(@RequestParam(required = false) String state) {
        if (state != null && !state.isBlank() && !"all".equalsIgnoreCase(state)) {
            return ResponseEntity.ok(circuitService.getCircuitsByState(state));
        }
        return ResponseEntity.ok(circuitService.getAllActiveCircuits());
    }

    @GetMapping("/states")
    public ResponseEntity<List<String>> getDistinctStates() {
        return ResponseEntity.ok(circuitService.getAllDistinctStates());
    }

    @GetMapping("/featured")
    public ResponseEntity<List<Circuit>> getFeaturedCircuits() {
        return ResponseEntity.ok(circuitService.getFeaturedCircuits());
    }

    @GetMapping("/{idOrSlug}")
    public ResponseEntity<Circuit> getCircuit(@PathVariable String idOrSlug) {
        try {
            Long id = Long.parseLong(idOrSlug);
            return circuitService.getCircuitById(id)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (NumberFormatException e) {
            return circuitService.getCircuitBySlug(idOrSlug)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        }
    }

    @PostMapping("/{id}/optimize-route")
    public ResponseEntity<com.globetrotter.gateway.service.RouteOptimizationService.RouteOptimizationResult> optimizeRoute(
            @PathVariable Long id,
            @RequestParam(required = false) Long startPlaceId,
            @RequestParam(defaultValue = "09:00") String startTime
    ) {
        java.time.LocalTime start = java.time.LocalTime.of(9, 0);
        try {
            start = java.time.LocalTime.parse(startTime);
        } catch (java.time.format.DateTimeParseException e) {
            log.warn("Invalid startTime '{}', defaulting to 09:00", startTime);
        }
        return ResponseEntity.ok(routeOptimizationService.optimizeCircuitRoute(id, startPlaceId, start));
    }

    @PostMapping("/{id}/next-location")
    public ResponseEntity<com.globetrotter.gateway.service.RouteOptimizationService.NextLocationDecisionDTO> evaluateNextLocation(
            @PathVariable Long id,
            @RequestParam(required = false) Long currentPlaceId,
            @RequestParam(defaultValue = "12:00") String currentTime,
            @RequestParam(required = false) List<Long> visitedPlaceIds
    ) {
        java.time.LocalTime time = java.time.LocalTime.of(12, 0);
        try {
            time = java.time.LocalTime.parse(currentTime);
        } catch (java.time.format.DateTimeParseException e) {
            log.warn("Invalid currentTime '{}', defaulting to 12:00", currentTime);
        }
        return ResponseEntity.ok(routeOptimizationService.evaluateNextBestLocation(id, currentPlaceId, time, visitedPlaceIds));
    }

    @GetMapping("/{id}/corridor-places")
    public ResponseEntity<List<com.globetrotter.gateway.model.Place>> getCorridorPlaces(@PathVariable Long id) {
        return ResponseEntity.ok(circuitService.getCorridorPlaces(id));
    }

    @PostMapping("/custom-route")
    public ResponseEntity<com.globetrotter.gateway.service.RouteOptimizationService.RouteOptimizationResult> optimizeCustomRoute(
            @RequestBody CustomRouteRequestDTO request
    ) {
        java.time.LocalTime start = java.time.LocalTime.of(9, 0);
        if (request.getStartTime() != null && !request.getStartTime().isBlank()) {
            try {
                start = java.time.LocalTime.parse(request.getStartTime());
            } catch (java.time.format.DateTimeParseException e) {
                log.warn("Invalid custom route startTime '{}', defaulting to 09:00", request.getStartTime());
            }
        }
        return ResponseEntity.ok(routeOptimizationService.optimizeCustomRoute(
                request.getPlaceIds(), request.getStartPlaceId(), start));
    }

    @lombok.Data
    public static class CustomRouteRequestDTO {
        private List<Long> placeIds;
        private Long startPlaceId;
        private String startTime;
    }
}

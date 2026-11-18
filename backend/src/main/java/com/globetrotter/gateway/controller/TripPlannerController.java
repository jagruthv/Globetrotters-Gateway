package com.globetrotter.gateway.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.globetrotter.gateway.payload.TripPlanRequest;
import com.globetrotter.gateway.service.AiModelRouterService;
import com.globetrotter.gateway.service.AiTripPlannerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/trip")
@RequiredArgsConstructor
public class TripPlannerController {

    private final AiTripPlannerService aiTripPlannerService;
    private final AiModelRouterService aiModelRouterService;

    @PostMapping(value = "/generate-ai-plan", produces = org.springframework.http.MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> generateAiPlan(@RequestBody TripPlanRequest request) {
        JsonNode node = aiTripPlannerService.planTrip(request);
        return ResponseEntity.ok(node != null ? node.toString() : "{}");
    }

    @GetMapping("/circuit-breaker-status")
    public ResponseEntity<Map<String, Object>> getCircuitBreakerStatus() {
        return ResponseEntity.ok(aiModelRouterService.getCircuitBreakerStatus());
    }
}

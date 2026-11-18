package com.globetrotter.gateway.controller;

import com.globetrotter.gateway.model.Circuit;
import com.globetrotter.gateway.model.CircuitPlace;
import com.globetrotter.gateway.model.Place;
import com.globetrotter.gateway.repository.CircuitRepository;
import com.globetrotter.gateway.repository.PlaceRepository;
import com.globetrotter.gateway.service.CircuitService;
import com.globetrotter.gateway.service.PlaceService;
import jakarta.validation.Valid;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * AdminController — full CRUD management for circuits, attractions, and circuit routes.
 * Accessible only to users with ROLE_ADMIN.
 */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final CircuitService circuitService;
    private final PlaceService placeService;
    private final CircuitRepository circuitRepository;
    private final PlaceRepository placeRepository;

    // ── Circuits Management ───────────────────────────────────────────────────

    @GetMapping("/circuits/all")
    public ResponseEntity<List<Circuit>> getAllCircuitsIncludingInactive() {
        return ResponseEntity.ok(circuitRepository.findAll());
    }

    @PostMapping("/circuits")
    public ResponseEntity<Circuit> createCircuit(@Valid @RequestBody Circuit circuit) {
        return ResponseEntity.ok(circuitService.createOrUpdateCircuit(circuit));
    }

    @PutMapping("/circuits/{id}")
    public ResponseEntity<Circuit> updateCircuit(@PathVariable Long id, @Valid @RequestBody Circuit circuit) {
        circuit.setId(id);
        return ResponseEntity.ok(circuitService.createOrUpdateCircuit(circuit));
    }

    @DeleteMapping("/circuits/{id}")
    public ResponseEntity<Void> deleteCircuit(@PathVariable Long id) {
        circuitService.deleteCircuit(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/circuits/{circuitId}/places")
    public ResponseEntity<CircuitPlace> addPlaceToCircuit(
            @PathVariable Long circuitId,
            @RequestBody AddPlaceToCircuitRequest request
    ) {
        CircuitPlace cp = circuitService.addPlaceToCircuit(
                circuitId,
                request.getPlaceId(),
                request.getSequenceOrder() != null ? request.getSequenceOrder() : 1,
                request.getDurationMins() != null ? request.getDurationMins() : 60,
                request.getTransitNote() != null ? request.getTransitNote() : "Self transit"
        );
        return ResponseEntity.ok(cp);
    }

    // ── Places / Attractions Management ───────────────────────────────────────

    @GetMapping("/places/all")
    public ResponseEntity<List<Place>> getAllPlacesIncludingInactive() {
        return ResponseEntity.ok(placeRepository.findAll());
    }

    @PostMapping("/places")
    public ResponseEntity<Place> createPlace(@Valid @RequestBody Place place) {
        return ResponseEntity.ok(placeService.createOrUpdatePlace(place));
    }

    @PutMapping("/places/{id}")
    public ResponseEntity<Place> updatePlace(@PathVariable Long id, @Valid @RequestBody Place place) {
        place.setId(id);
        return ResponseEntity.ok(placeService.createOrUpdatePlace(place));
    }

    @DeleteMapping("/places/{id}")
    public ResponseEntity<Void> deletePlace(@PathVariable Long id) {
        placeService.deletePlace(id);
        return ResponseEntity.noContent().build();
    }

    @Data
    public static class AddPlaceToCircuitRequest {
        private Long placeId;
        private Integer sequenceOrder;
        private Integer durationMins;
        private String transitNote;
    }
}

package com.globetrotter.gateway.service;

import com.globetrotter.gateway.model.Circuit;
import com.globetrotter.gateway.model.CircuitPlace;
import com.globetrotter.gateway.model.Place;
import com.globetrotter.gateway.repository.CircuitPlaceRepository;
import com.globetrotter.gateway.repository.CircuitRepository;
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
public class CircuitService {

    private final CircuitRepository circuitRepository;
    private final PlaceRepository placeRepository;
    private final CircuitPlaceRepository circuitPlaceRepository;

    // Cached: all active circuits — cache key "all", TTL 10 min (set in application.yml)
    @Cacheable(value = "circuits", key = "'all'")
    public List<Circuit> getAllActiveCircuits() {
        return circuitRepository.findByActiveTrue();
    }

    @Cacheable(value = "circuits", key = "'state_' + #state.toLowerCase()")
    public List<Circuit> getCircuitsByState(String state) {
        return circuitRepository.findByActiveTrueAndStateIgnoreCase(state);
    }

    @Cacheable(value = "circuits", key = "'distinct_states'")
    public List<String> getAllDistinctStates() {
        return circuitRepository.findDistinctStates();
    }

    // Cached: featured circuits shown on homepage
    @Cacheable(value = "circuits", key = "'featured'")
    public List<Circuit> getFeaturedCircuits() {
        return circuitRepository.findByActiveTrueAndFeaturedTrue();
    }

    // Individual circuit is cached by its slug (used most frequently from detail page)
    @Cacheable(value = "circuits", key = "#slug")
    public Optional<Circuit> getCircuitBySlug(String slug) {
        return circuitRepository.findBySlug(slug);
    }

    // Individual circuit by ID — not cached (used internally during booking, needs fresh data)
    public Optional<Circuit> getCircuitById(Long id) {
        return circuitRepository.findById(id);
    }

    // Evict entire circuits cache when a circuit is modified
    @Transactional
    @CacheEvict(value = "circuits", allEntries = true)
    public Circuit createOrUpdateCircuit(Circuit circuit) {
        if (circuit.getSlug() == null || circuit.getSlug().isBlank()) {
            circuit.setSlug(circuit.getTitle().toLowerCase().replaceAll("[^a-z0-9]+", "-"));
        }
        return circuitRepository.save(circuit);
    }

    // Evict cache when places are added to a circuit
    @Transactional
    @CacheEvict(value = "circuits", allEntries = true)
    public CircuitPlace addPlaceToCircuit(Long circuitId, Long placeId, int sequenceOrder, int durationMins, String transitNote) {
        Circuit circuit = circuitRepository.findById(circuitId)
                .orElseThrow(() -> new IllegalArgumentException("Circuit not found with id: " + circuitId));
        Place place = placeRepository.findById(placeId)
                .orElseThrow(() -> new IllegalArgumentException("Place not found with id: " + placeId));

        CircuitPlace circuitPlace = CircuitPlace.builder()
                .circuit(circuit)
                .place(place)
                .sequenceOrder(sequenceOrder)
                .estimatedDurationMins(durationMins)
                .transitNote(transitNote)
                .build();

        return circuitPlaceRepository.save(circuitPlace);
    }

    @Transactional
    @CacheEvict(value = "circuits", allEntries = true)
    public void deleteCircuit(Long id) {
        circuitRepository.findById(id).ifPresent(c -> {
            c.setActive(false);
            circuitRepository.save(c);
        });
    }

    public List<Place> getCorridorPlaces(Long circuitId) {
        Circuit circuit = circuitRepository.findById(circuitId)
                .orElseThrow(() -> new IllegalArgumentException("Circuit not found with id: " + circuitId));

        java.util.Set<Long> addedIds = new java.util.HashSet<>();
        java.util.List<Place> result = new java.util.ArrayList<>();

        // 1. First add all attractions explicitly assigned to this circuit
        if (circuit.getCircuitPlaces() != null) {
            for (CircuitPlace cp : circuit.getCircuitPlaces()) {
                if (cp.getPlace() != null && Boolean.TRUE.equals(cp.getPlace().getActive()) && addedIds.add(cp.getPlace().getId())) {
                    result.add(cp.getPlace());
                }
            }
        }

        // 2. Add all attractions from all corridor cities represented in the circuit places
        java.util.Set<String> corridorCities = new java.util.HashSet<>();
        for (Place p : result) {
            if (p.getCity() != null && !p.getCity().isBlank()) {
                corridorCities.add(p.getCity().trim().toLowerCase());
            }
        }

        for (String c : corridorCities) {
            for (Place p : placeRepository.findByCityIgnoreCase(c)) {
                if (Boolean.TRUE.equals(p.getActive()) && addedIds.add(p.getId())) {
                    result.add(p);
                }
            }
        }

        // 3. Fallback: if corridor has fewer than 4 spots, expand to state network
        if (result.size() < 4 && circuit.getState() != null) {
            for (Place p : placeRepository.findByStateIgnoreCase(circuit.getState())) {
                if (Boolean.TRUE.equals(p.getActive()) && addedIds.add(p.getId())) {
                    result.add(p);
                }
            }
        }

        return result;
    }
}

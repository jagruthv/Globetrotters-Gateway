package com.globetrotter.gateway.repository;

import com.globetrotter.gateway.model.CircuitPlace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CircuitPlaceRepository extends JpaRepository<CircuitPlace, Long> {
    List<CircuitPlace> findByCircuitIdOrderBySequenceOrderAsc(Long circuitId);
    boolean existsByCircuitIdAndPlaceId(Long circuitId, Long placeId);
    List<CircuitPlace> findByPlaceId(Long placeId);
}

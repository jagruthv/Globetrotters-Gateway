package com.globetrotter.gateway.repository;

import com.globetrotter.gateway.model.Circuit;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CircuitRepository extends JpaRepository<Circuit, Long> {
    @EntityGraph(attributePaths = {"circuitPlaces", "circuitPlaces.place"})
    Optional<Circuit> findBySlug(String slug);

    @EntityGraph(attributePaths = {"circuitPlaces", "circuitPlaces.place"})
    List<Circuit> findByActiveTrue();

    @EntityGraph(attributePaths = {"circuitPlaces", "circuitPlaces.place"})
    List<Circuit> findByActiveTrueAndFeaturedTrue();

    @EntityGraph(attributePaths = {"circuitPlaces", "circuitPlaces.place"})
    List<Circuit> findByActiveTrueAndStateIgnoreCase(String state);

    @Override
    @EntityGraph(attributePaths = {"circuitPlaces", "circuitPlaces.place"})
    Optional<Circuit> findById(Long id);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT c.state FROM Circuit c WHERE c.active = true AND c.state IS NOT NULL ORDER BY c.state ASC")
    List<String> findDistinctStates();
}

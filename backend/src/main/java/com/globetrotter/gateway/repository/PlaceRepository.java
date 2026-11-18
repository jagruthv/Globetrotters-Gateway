package com.globetrotter.gateway.repository;

import com.globetrotter.gateway.model.Place;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlaceRepository extends JpaRepository<Place, Long> {
    Optional<Place> findBySlug(String slug);
    Optional<Place> findByNameIgnoreCase(String name);
    List<Place> findByActiveTrue();
    List<Place> findByCategoryIgnoreCase(String category);
    List<Place> findByStateIgnoreCase(String state);
    List<Place> findByDistrictIgnoreCase(String district);
    List<Place> findByCityIgnoreCase(String city);
}

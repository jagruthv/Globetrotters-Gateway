package com.globetrotter.gateway.repository;

import com.globetrotter.gateway.model.CircuitPass;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CircuitPassRepository extends JpaRepository<CircuitPass, String> {

    Optional<CircuitPass> findByPassId(String passId);

    @Query("SELECT cp FROM CircuitPass cp LEFT JOIN FETCH cp.locations loc LEFT JOIN FETCH loc.location WHERE cp.passId = :passId")
    Optional<CircuitPass> findByPassIdWithLocations(@Param("passId") String passId);

    List<CircuitPass> findByUser_IdOrderByCreatedAtDesc(Long userId);
}

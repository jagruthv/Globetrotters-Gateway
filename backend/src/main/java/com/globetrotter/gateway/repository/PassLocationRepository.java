package com.globetrotter.gateway.repository;

import com.globetrotter.gateway.model.PassLocation;
import com.globetrotter.gateway.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface PassLocationRepository extends JpaRepository<PassLocation, Long> {

    Optional<PassLocation> findByPass_PassIdAndLocation_Id(String passId, Long locationId);

    List<PassLocation> findByPass_PassId(String passId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE PassLocation pl SET pl.status = 'REDEEMED', pl.redeemedAt = :now, pl.redeemedByAgent = :agent " +
           "WHERE pl.pass.passId = :passId AND pl.location.id = :locationId AND pl.status = 'UNUSED'")
    int atomicRedeem(
            @Param("passId") String passId,
            @Param("locationId") Long locationId,
            @Param("agent") User agent,
            @Param("now") Instant now
    );

    @Query("SELECT pl FROM PassLocation pl JOIN FETCH pl.pass p WHERE pl.location.id = :locationId AND pl.status = 'UNUSED' AND p.status = 'ACTIVE' AND p.validUntil >= :now")
    List<PassLocation> findActiveUnusedForLocation(@Param("locationId") Long locationId, @Param("now") Instant now);
}

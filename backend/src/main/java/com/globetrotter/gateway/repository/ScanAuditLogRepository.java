package com.globetrotter.gateway.repository;

import com.globetrotter.gateway.model.ScanAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScanAuditLogRepository extends JpaRepository<ScanAuditLog, Long> {

    List<ScanAuditLog> findTop50ByLocationIdOrderByScannedAtDesc(Long locationId);

    List<ScanAuditLog> findByPassIdOrderByScannedAtDesc(String passId);
}

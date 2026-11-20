package com.globetrotter.gateway.service;

import com.globetrotter.gateway.exception.InvalidQrFormatException;
import com.globetrotter.gateway.exception.InvalidQrSignatureException;
import com.globetrotter.gateway.exception.QrExpiredException;
import com.globetrotter.gateway.model.CircuitPass;
import com.globetrotter.gateway.model.PassLocation;
import com.globetrotter.gateway.model.Place;
import com.globetrotter.gateway.model.ScanAuditLog;
import com.globetrotter.gateway.model.User;
import com.globetrotter.gateway.payload.*;
import com.globetrotter.gateway.repository.CircuitPassRepository;
import com.globetrotter.gateway.repository.PassLocationRepository;
import com.globetrotter.gateway.repository.PlaceRepository;
import com.globetrotter.gateway.repository.ScanAuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AgentScanService {

    private final QrSignatureService qrSignatureService;
    private final CircuitPassRepository circuitPassRepository;
    private final PassLocationRepository passLocationRepository;
    private final ScanAuditLogRepository scanAuditLogRepository;
    private final PlaceRepository placeRepository;

    @Transactional
    public AgentScanResponse verifyAndRedeem(AgentScanRequest request, User agentUser) {
        Long agentId = agentUser != null && agentUser.getId() != null ? agentUser.getId() : 0L;
        Long locationId = resolveLocationId(request, agentUser);

        // ── Phase 1: Constant-Time Verification First (No Database Access) ──────
        ParsedQr parsedQr;
        try {
            parsedQr = qrSignatureService.verifyAndParse(request.getQrPayload());
        } catch (InvalidQrFormatException ex) {
            logAudit(null, locationId, agentId, "INVALID_FORMAT");
            return AgentScanResponse.builder()
                    .status("INVALID_FORMAT")
                    .message(ex.getMessage())
                    .locationId(locationId)
                    .build();
        } catch (InvalidQrSignatureException ex) {
            logAudit(null, locationId, agentId, "INVALID_SIGNATURE");
            return AgentScanResponse.builder()
                    .status("INVALID_SIGNATURE")
                    .message("Cryptographic HMAC signature verification failed. Counterfeit or tampered QR.")
                    .locationId(locationId)
                    .build();
        } catch (QrExpiredException ex) {
            logAudit(null, locationId, agentId, "PASS_EXPIRED");
            return AgentScanResponse.builder()
                    .status("PASS_EXPIRED")
                    .message(ex.getMessage())
                    .locationId(locationId)
                    .build();
        }

        String passId = parsedQr.passId();

        // ── Phase 2: Database Lookups & Circuit Pass Status Validation ──────────
        Optional<CircuitPass> passOpt = circuitPassRepository.findByPassId(passId);
        if (passOpt.isEmpty()) {
            logAudit(passId, locationId, agentId, "NOT_BOOKED_HERE");
            return AgentScanResponse.builder()
                    .status("NOT_BOOKED_HERE")
                    .message("Pass ID not found in database: " + passId)
                    .passId(passId)
                    .locationId(locationId)
                    .build();
        }

        CircuitPass circuitPass = passOpt.get();
        if (!"ACTIVE".equalsIgnoreCase(circuitPass.getStatus())) {
            logAudit(passId, locationId, agentId, "PASS_REVOKED");
            return AgentScanResponse.builder()
                    .status("PASS_REVOKED")
                    .message("Pass is not active (current status: " + circuitPass.getStatus() + ")")
                    .passId(passId)
                    .locationId(locationId)
                    .build();
        }

        Instant now = Instant.now();
        if (now.isBefore(circuitPass.getValidFrom())) {
            logAudit(passId, locationId, agentId, "PASS_EXPIRED");
            return AgentScanResponse.builder()
                    .status("PASS_EXPIRED")
                    .message("Pass visit window has not started yet. Valid from: " + circuitPass.getValidFrom())
                    .passId(passId)
                    .locationId(locationId)
                    .validUntil(circuitPass.getValidUntil())
                    .build();
        }

        // ── Phase 3: Single Conditional Atomic Anti-Replay Update ──────────────
        int rowsUpdated = passLocationRepository.atomicRedeem(passId, locationId, agentUser, now);

        if (rowsUpdated == 1) {
            // Successful first-time redemption
            logAudit(passId, locationId, agentId, "SUCCESS");
            PassLocation passLocation = passLocationRepository.findByPass_PassIdAndLocation_Id(passId, locationId)
                    .orElse(null);

            String locationName = passLocation != null && passLocation.getLocation() != null
                    ? passLocation.getLocation().getName()
                    : "Gate Checkpoint #" + locationId;
            int guestCount = passLocation != null ? passLocation.getGuestCount() : 1;
            String touristName = circuitPass.getUser() != null ? circuitPass.getUser().getFullName() : "Tourist";

            log.info("Pass {} successfully redeemed at location {} ({} guests)", passId, locationId, guestCount);

            return AgentScanResponse.builder()
                    .status("SUCCESS")
                    .message("Entry Granted: Admitted " + guestCount + " guest(s)")
                    .passId(passId)
                    .locationId(locationId)
                    .locationName(locationName)
                    .guestCount(guestCount)
                    .touristName(touristName)
                    .redeemedAt(now)
                    .validUntil(circuitPass.getValidUntil())
                    .build();
        }

        // ── Phase 4: Handle Update Misses (Already Redeemed or Not Booked Here) ─
        Optional<PassLocation> locOpt = passLocationRepository.findByPass_PassIdAndLocation_Id(passId, locationId);
        if (locOpt.isEmpty()) {
            logAudit(passId, locationId, agentId, "NOT_BOOKED_HERE");
            return AgentScanResponse.builder()
                    .status("NOT_BOOKED_HERE")
                    .message("Location #" + locationId + " is not included in this circuit pass")
                    .passId(passId)
                    .locationId(locationId)
                    .build();
        }

        PassLocation existingLoc = locOpt.get();
        if ("REDEEMED".equalsIgnoreCase(existingLoc.getStatus())) {
            logAudit(passId, locationId, agentId, "ALREADY_REDEEMED");
            return AgentScanResponse.builder()
                    .status("ALREADY_REDEEMED")
                    .message("Pass was already redeemed at this gate on " + existingLoc.getRedeemedAt())
                    .passId(passId)
                    .locationId(locationId)
                    .locationName(existingLoc.getLocation() != null ? existingLoc.getLocation().getName() : null)
                    .guestCount(existingLoc.getGuestCount())
                    .redeemedAt(existingLoc.getRedeemedAt())
                    .validUntil(circuitPass.getValidUntil())
                    .build();
        }

        logAudit(passId, locationId, agentId, "PASS_REVOKED");
        return AgentScanResponse.builder()
                .status("PASS_REVOKED")
                .message("Location status is " + existingLoc.getStatus() + " (not UNUSED)")
                .passId(passId)
                .locationId(locationId)
                .build();
    }

    @Transactional(readOnly = true)
    public SyncManifestResponse getManifest(User agentUser, Long locationIdOverride) {
        Long locationId = resolveLocationId(AgentScanRequest.builder().locationId(locationIdOverride).build(), agentUser);
        Instant now = Instant.now();

        List<PassLocation> activeLocations = passLocationRepository.findActiveUnusedForLocation(locationId, now);

        String locationName = placeRepository.findById(locationId)
                .map(Place::getName)
                .orElse("Gate Checkpoint #" + locationId);

        List<ManifestItemDTO> items = activeLocations.stream()
                .map(pl -> ManifestItemDTO.builder()
                        .passId(pl.getPass().getPassId())
                        .guestCount(pl.getGuestCount())
                        .validUntil(pl.getPass().getValidUntil())
                        .build())
                .collect(Collectors.toList());

        return SyncManifestResponse.builder()
                .locationId(locationId)
                .locationName(locationName)
                .generatedAt(now)
                .passes(items)
                .build();
    }

    @Transactional
    public OfflineSyncResponse syncRedemptions(OfflineRedemptionSyncRequest request, User agentUser) {
        if (request == null || request.getScans() == null || request.getScans().isEmpty()) {
            return OfflineSyncResponse.builder()
                    .totalProcessed(0)
                    .successCount(0)
                    .rejectedCount(0)
                    .results(List.of())
                    .build();
        }

        List<AgentScanResponse> results = new ArrayList<>();
        int success = 0;
        int rejected = 0;

        for (OfflineScanItem item : request.getScans()) {
            AgentScanRequest scanReq = AgentScanRequest.builder()
                    .qrPayload(item.getQrPayload())
                    .locationId(item.getLocationId())
                    .deviceTerminalId(item.getTerminalId())
                    .build();

            AgentScanResponse res = verifyAndRedeem(scanReq, agentUser);
            results.add(res);
            if ("SUCCESS".equals(res.getStatus())) {
                success++;
            } else {
                rejected++;
            }
        }

        return OfflineSyncResponse.builder()
                .totalProcessed(request.getScans().size())
                .successCount(success)
                .rejectedCount(rejected)
                .results(results)
                .build();
    }

    private Long resolveLocationId(AgentScanRequest request, User agentUser) {
        // Priority 1: If agentUser has an assignedLocation, enforce it (or verify match)
        if (agentUser != null && agentUser.getAssignedLocation() != null) {
            Long assignedId = agentUser.getAssignedLocation().getId();
            if (request != null && request.getLocationId() != null && !request.getLocationId().equals(assignedId)) {
                // If user is not admin, deny spoofing
                if (agentUser.getRole() != com.globetrotter.gateway.model.Role.ROLE_ADMIN) {
                    log.warn("Agent {} attempted to verify location {} but is assigned to {}",
                            agentUser.getEmail(), request.getLocationId(), assignedId);
                    return assignedId;
                }
            }
            return assignedId;
        }

        // Priority 2: Admin or unassigned agent specifying locationId
        if (request != null && request.getLocationId() != null && request.getLocationId() > 0) {
            return request.getLocationId();
        }

        // Default fallback to 1L (e.g. Kailasagiri / Borra Caves) for test environments
        return 1L;
    }

    private void logAudit(String passId, Long locationId, Long agentId, String result) {
        try {
            ScanAuditLog auditLog = ScanAuditLog.builder()
                    .passId(passId)
                    .locationId(locationId != null ? locationId : 0L)
                    .agentId(agentId != null ? agentId : 0L)
                    .result(result)
                    .scannedAt(Instant.now())
                    .build();
            scanAuditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.error("Failed to write scan audit log: passId={}, result={}", passId, result, e);
        }
    }
}

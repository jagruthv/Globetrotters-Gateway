package com.globetrotter.gateway.controller;

import com.globetrotter.gateway.model.User;
import com.globetrotter.gateway.payload.*;
import com.globetrotter.gateway.repository.UserRepository;
import com.globetrotter.gateway.security.UserDetailsImpl;
import com.globetrotter.gateway.service.AgentScanService;
import com.globetrotter.gateway.service.RateLimitingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/agent")
@RequiredArgsConstructor
@Slf4j
public class AgentScanController {

    private final AgentScanService agentScanService;
    private final UserRepository userRepository;
    private final RateLimitingService rateLimitingService;

    @PostMapping("/verify-scan")
    @PreAuthorize("hasAnyAuthority('ROLE_AGENT', 'ROLE_STAFF', 'ROLE_ADMIN')")
    public ResponseEntity<AgentScanResponse> verifyScan(
            Authentication authentication,
            @Valid @RequestBody AgentScanRequest request
    ) {
        User agentUser = extractAgentUser(authentication);
        String rateLimitKey = agentUser != null ? "agent_" + agentUser.getId() : "agent_anon";

        if (!rateLimitingService.tryConsumeScan(rateLimitKey)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(
                    AgentScanResponse.builder()
                            .status("RATE_LIMITED")
                            .message("Scanner rate limit exceeded. Please wait a few seconds before the next scan.")
                            .build()
            );
        }

        AgentScanResponse response = agentScanService.verifyAndRedeem(request, agentUser);

        // Map domain status codes to exact REST HTTP semantics
        return switch (response.getStatus()) {
            case "SUCCESS" -> ResponseEntity.ok(response);
            case "ALREADY_REDEEMED" -> ResponseEntity.status(HttpStatus.CONFLICT).body(response);
            case "NOT_BOOKED_HERE" -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            case "PASS_REVOKED" -> ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
            default -> ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        };
    }

    @GetMapping("/sync-manifest")
    @PreAuthorize("hasAnyAuthority('ROLE_AGENT', 'ROLE_STAFF', 'ROLE_ADMIN')")
    public ResponseEntity<SyncManifestResponse> getSyncManifest(
            Authentication authentication,
            @RequestParam(required = false) Long locationId
    ) {
        User agentUser = extractAgentUser(authentication);
        return ResponseEntity.ok(agentScanService.getManifest(agentUser, locationId));
    }

    @PostMapping("/sync-redemptions")
    @PreAuthorize("hasAnyAuthority('ROLE_AGENT', 'ROLE_STAFF', 'ROLE_ADMIN')")
    public ResponseEntity<OfflineSyncResponse> syncRedemptions(
            Authentication authentication,
            @RequestBody OfflineRedemptionSyncRequest request
    ) {
        User agentUser = extractAgentUser(authentication);
        return ResponseEntity.ok(agentScanService.syncRedemptions(request, agentUser));
    }

    private User extractAgentUser(Authentication authentication) {
        if (authentication == null) {
            return null;
        }
        if (authentication.getPrincipal() instanceof UserDetailsImpl userDetails) {
            return userRepository.findById(userDetails.getId()).orElse(null);
        }
        String username = authentication.getName();
        return userRepository.findByEmail(username).orElse(null);
    }
}

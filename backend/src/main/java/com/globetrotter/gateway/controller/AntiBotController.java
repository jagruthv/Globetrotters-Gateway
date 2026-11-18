package com.globetrotter.gateway.controller;

import com.globetrotter.gateway.security.ProofOfWorkSecurityService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * AntiBotController — REST API endpoints for client-side Proof-of-Work (PoW) issuance,
 * challenge verification, deceptive honeypot traps, and threat observability.
 */
@RestController
@RequestMapping("/api/security")
@RequiredArgsConstructor
@Slf4j
public class AntiBotController {

    private final ProofOfWorkSecurityService proofOfWorkSecurityService;

    @Data
    public static class VerifyPoWRequest {
        private String challengeToken;
        private Long nonce;
        private String clientIntegrity;
    }

    /**
     * Issues an ephemeral HMAC-SHA256 signed cryptographic PoW challenge.
     * Solved in background by client Web Crypto API (~30-80ms).
     */
    @GetMapping("/challenge")
    public ResponseEntity<Map<String, Object>> getChallenge() {
        Map<String, Object> challenge = proofOfWorkSecurityService.generateChallenge();
        return ResponseEntity.ok(challenge);
    }

    /**
     * Verifies client-solved Proof-of-Work nonce in O(1) time.
     */
    @PostMapping("/verify-pow")
    public ResponseEntity<?> verifyPoW(@RequestBody VerifyPoWRequest request) {
        if (request.getChallengeToken() == null || request.getNonce() == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "verified", false,
                    "error", "Missing challengeToken or nonce"
            ));
        }

        boolean isValid = proofOfWorkSecurityService.verifyChallenge(
                request.getChallengeToken(),
                request.getNonce()
        );

        if (isValid) {
            return ResponseEntity.ok(Map.of(
                    "verified", true,
                    "message", "Proof-of-Work validated successfully. Client cleared.",
                    "timestamp", System.currentTimeMillis()
            ));
        } else {
            return ResponseEntity.status(403).body(Map.of(
                    "verified", false,
                    "error", "Invalid or expired Proof-of-Work solution."
            ));
        }
    }

    /**
     * Honeypot trap endpoint. Crawlers hitting this are automatically quarantined.
     */
    @GetMapping("/honeypot-trap")
    public ResponseEntity<?> honeypotTrap() {
        return ResponseEntity.status(403).body(Map.of(
                "error", "BOT_QUARANTINED",
                "message", "Automated crawler detected and quarantined."
        ));
    }

    /**
     * Observability metrics: count of challenges issued, solved, bots quarantined, honeypots tripped.
     */
    @GetMapping("/metrics")
    public ResponseEntity<Map<String, Object>> getMetrics() {
        return ResponseEntity.ok(proofOfWorkSecurityService.getSecurityMetrics());
    }
}

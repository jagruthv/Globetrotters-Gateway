package com.globetrotter.gateway.security;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * ProofOfWorkSecurityService — Zero-friction cryptographic Proof-of-Work (PoW),
 * Honeypot Trap detection, and Dynamic In-Memory IP Quarantine (IP Jail).
 *
 * Grounded in:
 * - Hashcash (Back, 1997/2002)
 * - ALTCHA Protocol (Self-hosted Proof-of-Work Challenge Specification)
 * - OWASP Automated Threats (OAT-005 Scraping, OAT-006 Scalping, OAT-008 DoS)
 */
@Service
@Slf4j
public class ProofOfWorkSecurityService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final int DEFAULT_DIFFICULTY = 16; // 16 leading zero bits (4 hex chars), ~50ms on browser
    private static final long CHALLENGE_TTL_SECONDS = 300L; // 5 minutes

    @Value("${app.jwt.secret:default-insecure-secret-key-that-should-be-at-least-256-bits-long-for-hmac-sha256}")
    private String secretKey;

    private final SecureRandom secureRandom = new SecureRandom();

    // Cache of solved challenges to prevent replay attacks (TTL: 10 minutes)
    private final Cache<String, Boolean> solvedChallengesCache = Caffeine.newBuilder()
            .expireAfterWrite(Duration.ofMinutes(10))
            .maximumSize(100_000)
            .build();

    // In-memory IP Jail: dynamically quarantines hostile scrapers, bots, and brute-force IPs
    private final Cache<String, JailRecord> ipJailCache = Caffeine.newBuilder()
            .expireAfterWrite(Duration.ofHours(24))
            .maximumSize(50_000)
            .build();

    // Metric counters for security observability
    private final AtomicLong challengesIssued = new AtomicLong(0);
    private final AtomicLong challengesSolved = new AtomicLong(0);
    private final AtomicLong botsQuarantined = new AtomicLong(0);
    private final AtomicLong honeypotsTripped = new AtomicLong(0);

    @Getter
    public static class JailRecord {
        private final String ip;
        private final String reason;
        private final Instant jailedAt;
        private final Instant expiresAt;
        private final int violationCount;

        public JailRecord(String ip, String reason, Duration duration, int violationCount) {
            this.ip = ip;
            this.reason = reason;
            this.jailedAt = Instant.now();
            this.expiresAt = this.jailedAt.plus(duration);
            this.violationCount = violationCount;
        }

        public boolean isExpired() {
            return Instant.now().isAfter(expiresAt);
        }

        public long getRemainingSeconds() {
            long remaining = Duration.between(Instant.now(), expiresAt).getSeconds();
            return Math.max(0, remaining);
        }
    }

    /**
     * Generate an ephemeral cryptographic challenge token for the client.
     * Format: Base64(salt:timestamp:difficulty:hmac)
     */
    public Map<String, Object> generateChallenge() {
        challengesIssued.incrementAndGet();

        byte[] saltBytes = new byte[16];
        secureRandom.nextBytes(saltBytes);
        String salt = HexFormat.of().formatHex(saltBytes);
        long timestamp = Instant.now().toEpochMilli();
        int difficulty = DEFAULT_DIFFICULTY;

        String payload = salt + ":" + timestamp + ":" + difficulty;
        String hmac = computeHmac(payload);
        String challengeToken = Base64.getUrlEncoder().withoutPadding()
                .encodeToString((payload + ":" + hmac).getBytes(StandardCharsets.UTF_8));

        return Map.of(
                "challengeToken", challengeToken,
                "salt", salt,
                "timestamp", timestamp,
                "difficulty", difficulty,
                "algorithm", "SHA-256",
                "maxAgeSeconds", CHALLENGE_TTL_SECONDS
        );
    }

    /**
     * Verify client PoW solution in O(1) time.
     * Computes SHA-256(challengeToken + ":" + nonce) and verifies leading zero bits.
     */
    public boolean verifyChallenge(String challengeToken, long nonce) {
        if (challengeToken == null || challengeToken.isBlank() || nonce < 0) {
            return false;
        }

        // 1. Check replay cache
        String replayKey = challengeToken + ":" + nonce;
        if (solvedChallengesCache.getIfPresent(replayKey) != null) {
            log.warn("PoW challenge replay detected: {}", replayKey);
            return false;
        }

        // 2. Decode and parse token
        try {
            byte[] decoded = Base64.getUrlDecoder().decode(challengeToken);
            String raw = new String(decoded, StandardCharsets.UTF_8);
            String[] parts = raw.split(":");
            if (parts.length != 4) {
                return false;
            }

            String salt = parts[0];
            long timestamp = Long.parseLong(parts[1]);
            int difficulty = Integer.parseInt(parts[2]);
            String expectedHmac = parts[3];

            // 3. Verify freshness
            long now = Instant.now().toEpochMilli();
            if (now - timestamp > (CHALLENGE_TTL_SECONDS * 1000) || timestamp > now + 5000) {
                log.warn("PoW challenge expired or from future: age={}ms", (now - timestamp));
                return false;
            }

            // 4. Verify HMAC authenticity
            String payload = salt + ":" + timestamp + ":" + difficulty;
            String computedHmac = computeHmac(payload);
            if (!MessageDigest.isEqual(computedHmac.getBytes(StandardCharsets.UTF_8),
                    expectedHmac.getBytes(StandardCharsets.UTF_8))) {
                log.warn("PoW challenge signature mismatch");
                return false;
            }

            // 5. Verify cryptographic hash condition: SHA-256(challengeToken:nonce)
            String hashInput = challengeToken + ":" + nonce;
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(hashInput.getBytes(StandardCharsets.UTF_8));

            if (!hasLeadingZeroBits(hashBytes, difficulty)) {
                log.warn("PoW solution hash did not meet difficulty requirement {}", difficulty);
                return false;
            }

            // Mark challenge as consumed (replays impossible)
            solvedChallengesCache.put(replayKey, Boolean.TRUE);
            challengesSolved.incrementAndGet();
            return true;

        } catch (Exception e) {
            log.error("Error validating PoW solution", e);
            return false;
        }
    }

    /**
     * Check if a given IP is actively quarantined in the IP Jail.
     */
    public boolean isJailed(String ip) {
        if (ip == null || ip.isBlank()) {
            return false;
        }
        JailRecord record = ipJailCache.getIfPresent(ip);
        if (record != null) {
            if (record.isExpired()) {
                ipJailCache.invalidate(ip);
                return false;
            }
            return true;
        }
        return false;
    }

    /**
     * Get active quarantine details for an IP.
     */
    public JailRecord getJailRecord(String ip) {
        return ipJailCache.getIfPresent(ip);
    }

    /**
     * Commit an offending IP to the Quarantine Jail.
     */
    public void jailIp(String ip, String reason, Duration duration) {
        if (ip == null || ip.isBlank() || isLocalhost(ip)) {
            return;
        }
        JailRecord existing = ipJailCache.getIfPresent(ip);
        int violations = (existing != null) ? existing.getViolationCount() + 1 : 1;
        Duration effectiveDuration = duration.multipliedBy(Math.min(violations, 5));

        JailRecord record = new JailRecord(ip, reason, effectiveDuration, violations);
        ipJailCache.put(ip, record);
        botsQuarantined.incrementAndGet();
        log.warn("🚨 [IP JAIL ACTIVATED] IP={} quarantined for {} mins. Reason: {}. ViolationCount={}",
                ip, effectiveDuration.toMinutes(), reason, violations);
    }

    /**
     * Trigger honeypot violation: crawler accessed deceptive hidden route or filled canary input.
     */
    public void recordHoneypotTrigger(String ip, String canaryType) {
        honeypotsTripped.incrementAndGet();
        jailIp(ip, "Honeypot trap tripped (" + canaryType + ")", Duration.ofHours(24));
    }

    /**
     * Security statistics and metrics for platform monitoring.
     */
    public Map<String, Object> getSecurityMetrics() {
        return Map.of(
                "challengesIssued", challengesIssued.get(),
                "challengesSolved", challengesSolved.get(),
                "botsQuarantined", botsQuarantined.get(),
                "honeypotsTripped", honeypotsTripped.get(),
                "currentlyJailedIps", ipJailCache.estimatedSize(),
                "recentSolvedChallengesCached", solvedChallengesCache.estimatedSize()
        );
    }

    // Helper: Compute HMAC-SHA256 signature
    private String computeHmac(String data) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            SecretKeySpec secretKeySpec = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM);
            mac.init(secretKeySpec);
            byte[] hmacBytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hmacBytes);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to calculate HMAC", e);
        }
    }

    // Helper: Check leading zero bits in byte array
    private boolean hasLeadingZeroBits(byte[] bytes, int requiredZeroBits) {
        int fullBytes = requiredZeroBits / 8;
        int remainingBits = requiredZeroBits % 8;

        for (int i = 0; i < fullBytes; i++) {
            if (bytes[i] != 0) {
                return false;
            }
        }

        if (remainingBits > 0) {
            int mask = (0xFF << (8 - remainingBits)) & 0xFF;
            return (bytes[fullBytes] & mask) == 0;
        }

        return true;
    }

    private boolean isLocalhost(String ip) {
        return "127.0.0.1".equals(ip) || "0:0:0:0:0:0:0:1".equals(ip) || "localhost".equalsIgnoreCase(ip);
    }
}

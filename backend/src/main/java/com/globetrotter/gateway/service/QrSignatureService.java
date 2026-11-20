package com.globetrotter.gateway.service;

import com.globetrotter.gateway.exception.InvalidQrFormatException;
import com.globetrotter.gateway.exception.InvalidQrSignatureException;
import com.globetrotter.gateway.exception.QrExpiredException;
import com.globetrotter.gateway.payload.ParsedQr;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;

/**
 * QrSignatureService — High-performance, constant-size, HMAC-SHA256 signed Circuit Pass engine.
 *
 * QR Structure: v1.<pass_id>.<expiry_epoch_sec>.<hmac_signature>
 * - pass_id: URL-safe unique pass identifier (e.g. GTG-8K4M9X2P)
 * - expiry_epoch_sec: Unix timestamp (seconds) when the circuit pass expires
 * - hmac_signature: Base64URL-encoded (no padding) HMAC-SHA256 over "v1.<pass_id>.<expiry_epoch_sec>"
 */
@Service
@Slf4j
public class QrSignatureService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final String CHARSET_ALPHANUMERIC = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final int PASS_ID_RANDOM_LENGTH = 8;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Value("${app.qr.hmac-secret}")
    private String hmacSecret;

    @PostConstruct
    public void validateConfiguration() {
        if (hmacSecret == null || hmacSecret.trim().isEmpty() || hmacSecret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("CRITICAL SECURITY ERROR: QR_HMAC_SECRET is missing or shorter than 32 bytes (minimum 256 bits required for HMAC-SHA256).");
        }
        log.info("QrSignatureService initialized with 256-bit HMAC secret validation.");
    }

    /**
     * Generates a URL-safe, compact unique pass identifier (e.g., GTG-8K4M9X2P).
     */
    public String generatePassId() {
        StringBuilder sb = new StringBuilder("GTG-");
        for (int i = 0; i < PASS_ID_RANDOM_LENGTH; i++) {
            int idx = SECURE_RANDOM.nextInt(CHARSET_ALPHANUMERIC.length());
            sb.append(CHARSET_ALPHANUMERIC.charAt(idx));
        }
        return sb.toString();
    }

    /**
     * Generates the constant-size signed QR payload string.
     * Output format: v1.<pass_id>.<expiry_epoch_sec>.<hmac_signature>
     */
    public String generateQrPayload(String passId, Instant validUntil) {
        if (passId == null || passId.isBlank()) {
            throw new IllegalArgumentException("passId must not be null or blank");
        }
        if (validUntil == null) {
            throw new IllegalArgumentException("validUntil must not be null");
        }

        long expiryEpochSec = validUntil.getEpochSecond();
        String dataToSign = "v1." + passId + "." + expiryEpochSec;
        byte[] hmacBytes = computeHmac(dataToSign);
        String signature = Base64.getUrlEncoder().withoutPadding().encodeToString(hmacBytes);

        return dataToSign + "." + signature;
    }

    /**
     * Constant-time verification & parsing before database access.
     * Throws typed exceptions on invalid format, invalid signature, or expired passes.
     */
    public ParsedQr verifyAndParse(String rawQrPayload) {
        if (rawQrPayload == null || rawQrPayload.trim().isEmpty()) {
            throw new InvalidQrFormatException("Empty or null QR payload provided");
        }

        String[] parts = rawQrPayload.trim().split("\\.");
        if (parts.length != 4) {
            throw new InvalidQrFormatException("Malformed QR payload structure: expected 4 dot-separated segments");
        }

        if (!"v1".equals(parts[0])) {
            throw new InvalidQrFormatException("Unsupported QR version prefix: " + parts[0]);
        }

        String passId = parts[1];
        if (passId.isBlank() || passId.length() > 32) {
            throw new InvalidQrFormatException("Invalid pass identifier in QR payload");
        }

        long expiryEpochSec;
        try {
            expiryEpochSec = Long.parseLong(parts[2]);
        } catch (NumberFormatException e) {
            throw new InvalidQrFormatException("Malformed expiry timestamp in QR payload");
        }

        String providedSignature = parts[3];
        String dataToSign = "v1." + passId + "." + expiryEpochSec;
        byte[] expectedHmac = computeHmac(dataToSign);
        String expectedSignature = Base64.getUrlEncoder().withoutPadding().encodeToString(expectedHmac);

        // Constant-time signature comparison to eliminate side-channel timing attacks
        boolean signaturesMatch = MessageDigest.isEqual(
                expectedSignature.getBytes(StandardCharsets.UTF_8),
                providedSignature.getBytes(StandardCharsets.UTF_8)
        );

        if (!signaturesMatch) {
            throw new InvalidQrSignatureException("Cryptographic HMAC signature verification failed");
        }

        // Expiry check
        Instant now = Instant.now();
        if (now.getEpochSecond() > expiryEpochSec) {
            throw new QrExpiredException("Circuit pass expired at " + Instant.ofEpochSecond(expiryEpochSec) + " (current time: " + now + ")");
        }

        return new ParsedQr(passId, Instant.ofEpochSecond(expiryEpochSec), expiryEpochSec);
    }

    private byte[] computeHmac(String data) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            SecretKeySpec secretKeySpec = new SecretKeySpec(
                    hmacSecret.getBytes(StandardCharsets.UTF_8),
                    HMAC_ALGORITHM
            );
            mac.init(secretKeySpec);
            return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException("Failed to compute HMAC-SHA256 signature", e);
        }
    }
}

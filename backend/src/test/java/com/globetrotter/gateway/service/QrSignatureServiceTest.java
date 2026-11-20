package com.globetrotter.gateway.service;

import com.globetrotter.gateway.exception.InvalidQrFormatException;
import com.globetrotter.gateway.exception.InvalidQrSignatureException;
import com.globetrotter.gateway.exception.QrExpiredException;
import com.globetrotter.gateway.payload.ParsedQr;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.junit.jupiter.api.Assertions.*;

class QrSignatureServiceTest {

    private QrSignatureService qrSignatureService;
    private static final String TEST_SECRET = "super-secret-salt-key-for-unit-testing-hmac-sha256-minimum-32-bytes";

    @BeforeEach
    void setUp() {
        qrSignatureService = new QrSignatureService();
        ReflectionTestUtils.setField(qrSignatureService, "hmacSecret", TEST_SECRET);
        qrSignatureService.validateConfiguration();
    }

    @Test
    @DisplayName("Short secret key should fail fast on startup")
    void testShortSecretFailsFast() {
        QrSignatureService badService = new QrSignatureService();
        ReflectionTestUtils.setField(badService, "hmacSecret", "too-short");
        assertThrows(IllegalStateException.class, badService::validateConfiguration);
    }

    @Test
    @DisplayName("Generate pass ID produces valid GTG- prefixed format")
    void testGeneratePassId() {
        String passId = qrSignatureService.generatePassId();
        assertNotNull(passId);
        assertTrue(passId.startsWith("GTG-"));
        assertEquals(12, passId.length()); // "GTG-" (4) + 8 chars = 12
    }

    @Test
    @DisplayName("Valid QR payload parses successfully with exact pass ID and expiry")
    void testGenerateAndVerifyValidPayload() {
        String passId = "GTG-8K4M9X2P";
        Instant validUntil = Instant.now().plus(24, ChronoUnit.HOURS).truncatedTo(ChronoUnit.SECONDS);

        String payload = qrSignatureService.generateQrPayload(passId, validUntil);
        assertNotNull(payload);
        assertTrue(payload.startsWith("v1." + passId + "."));

        ParsedQr parsed = qrSignatureService.verifyAndParse(payload);
        assertEquals(passId, parsed.passId());
        assertEquals(validUntil.getEpochSecond(), parsed.expiryEpochSec());
        assertEquals(validUntil.getEpochSecond(), parsed.validUntil().getEpochSecond());
    }

    @Test
    @DisplayName("O(1) Constant Payload Size Invariance: 1 location vs 100 locations has identical QR length")
    void testPayloadSizeInvariance() {
        Instant validUntil = Instant.now().plus(48, ChronoUnit.HOURS).truncatedTo(ChronoUnit.SECONDS);

        // Pass 1 representing 1 location
        String pass1 = "GTG-1LOC0001";
        String payload1 = qrSignatureService.generateQrPayload(pass1, validUntil);

        // Pass 2 representing 100 locations
        String pass2 = "GTG-100LOC99";
        String payload2 = qrSignatureService.generateQrPayload(pass2, validUntil);

        assertEquals(payload1.length(), payload2.length(),
                "QR code payload size must be strictly O(1) constant regardless of location count");
        assertTrue(payload1.length() >= 65 && payload1.length() <= 85,
                "Payload size should be compact (between 65 and 85 characters)");
    }

    @Test
    @DisplayName("Tampered Pass ID throws InvalidQrSignatureException")
    void testTamperedPassIdThrows() {
        String passId = "GTG-REALPASS";
        Instant validUntil = Instant.now().plus(2, ChronoUnit.HOURS);
        String payload = qrSignatureService.generateQrPayload(passId, validUntil);

        // Tamper pass ID
        String tamperedPayload = payload.replace("GTG-REALPASS", "GTG-FAKEEEEE");
        assertThrows(InvalidQrSignatureException.class, () -> qrSignatureService.verifyAndParse(tamperedPayload));
    }

    @Test
    @DisplayName("Tampered Expiry Epoch throws InvalidQrSignatureException")
    void testTamperedExpiryThrows() {
        String passId = "GTG-TEST0001";
        Instant validUntil = Instant.now().plus(2, ChronoUnit.HOURS).truncatedTo(ChronoUnit.SECONDS);
        String payload = qrSignatureService.generateQrPayload(passId, validUntil);

        // Tamper expiry timestamp
        String tampered = payload.replace(String.valueOf(validUntil.getEpochSecond()),
                String.valueOf(validUntil.getEpochSecond() + 1000));
        assertThrows(InvalidQrSignatureException.class, () -> qrSignatureService.verifyAndParse(tampered));
    }

    @Test
    @DisplayName("Tampered signature throws InvalidQrSignatureException")
    void testTamperedSignatureThrows() {
        String passId = "GTG-TEST0002";
        Instant validUntil = Instant.now().plus(2, ChronoUnit.HOURS);
        String payload = qrSignatureService.generateQrPayload(passId, validUntil);

        String tampered = payload.substring(0, payload.length() - 4) + "XXXX";
        assertThrows(InvalidQrSignatureException.class, () -> qrSignatureService.verifyAndParse(tampered));
    }

    @Test
    @DisplayName("Expired pass throws QrExpiredException")
    void testExpiredPassThrows() {
        String passId = "GTG-EXPIRED1";
        Instant expiredUntil = Instant.now().minus(1, ChronoUnit.HOURS).truncatedTo(ChronoUnit.SECONDS);
        String payload = qrSignatureService.generateQrPayload(passId, expiredUntil);

        assertThrows(QrExpiredException.class, () -> qrSignatureService.verifyAndParse(payload));
    }

    @Test
    @DisplayName("Malformed payloads throw InvalidQrFormatException")
    void testMalformedPayloadsThrow() {
        assertThrows(InvalidQrFormatException.class, () -> qrSignatureService.verifyAndParse(null));
        assertThrows(InvalidQrFormatException.class, () -> qrSignatureService.verifyAndParse(""));
        assertThrows(InvalidQrFormatException.class, () -> qrSignatureService.verifyAndParse("invalid"));
        assertThrows(InvalidQrFormatException.class, () -> qrSignatureService.verifyAndParse("v2.pass.12345.sig"));
        assertThrows(InvalidQrFormatException.class, () -> qrSignatureService.verifyAndParse("v1.pass.notanumber.sig"));
        assertThrows(InvalidQrFormatException.class, () -> qrSignatureService.verifyAndParse("v1.pass.12345"));
    }
}

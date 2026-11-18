package com.globetrotter.gateway.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class QrCodeServiceTest {

    private QrCodeService qrCodeService;
    private final String testHmacSecret = "test-super-secret-key-for-hmac-sha256-verification-2026";

    @BeforeEach
    void setUp() {
        qrCodeService = new QrCodeService();
        ReflectionTestUtils.setField(qrCodeService, "hmacSecret", testHmacSecret);
    }

    @Test
    @DisplayName("generateSignedPassToken produces valid GT_PASS format with 6 parts")
    void testGenerateSignedPassTokenFormat() {
        String token = qrCodeService.generateSignedPassToken("GT-A1B2C3D4", 10L, 20L);

        assertNotNull(token);
        assertTrue(token.startsWith("GT_PASS:"));
        String[] parts = token.split(":");
        assertEquals(6, parts.length);
        assertEquals("GT_PASS", parts[0]);
        assertEquals("GT-A1B2C3D4", parts[1]);
        assertEquals("10", parts[2]);
        assertEquals("20", parts[3]);
        assertFalse(parts[4].isBlank()); // timestamp
        assertFalse(parts[5].isBlank()); // signature
    }

    @Test
    @DisplayName("verifyPassToken returns true for genuine generated token")
    void testVerifyPassTokenGenuine() {
        String token = qrCodeService.generateSignedPassToken("GT-A1B2C3D4", 10L, 20L);
        assertTrue(qrCodeService.verifyPassToken(token));
    }

    @Test
    @DisplayName("verifyPassToken returns false for tampered booking reference")
    void testVerifyPassTokenTamperedPayload() {
        String genuine = qrCodeService.generateSignedPassToken("GT-A1B2C3D4", 10L, 20L);
        String tampered = genuine.replace("GT-A1B2C3D4", "GT-TAMPERED");

        assertFalse(qrCodeService.verifyPassToken(tampered));
    }

    @Test
    @DisplayName("verifyPassToken returns false for forged signature")
    void testVerifyPassTokenForgedSignature() {
        String genuine = qrCodeService.generateSignedPassToken("GT-A1B2C3D4", 10L, 20L);
        String[] parts = genuine.split(":");
        parts[5] = "forged_signature_xyz_123";
        String forged = String.join(":", parts);

        assertFalse(qrCodeService.verifyPassToken(forged));
    }

    @Test
    @DisplayName("verifyPassToken returns false for null or malformed token")
    void testVerifyPassTokenMalformed() {
        assertFalse(qrCodeService.verifyPassToken(null));
        assertFalse(qrCodeService.verifyPassToken(""));
        assertFalse(qrCodeService.verifyPassToken("INVALID_PREFIX:GT-123"));
        assertFalse(qrCodeService.verifyPassToken("GT_PASS:short"));
    }

    @Test
    @DisplayName("verifyPassToken returns false for expired token (> 30 days old)")
    void testVerifyPassTokenExpired() {
        // Create token with timestamp 35 days ago
        long oldTimestamp = System.currentTimeMillis() - (35L * 24 * 60 * 60 * 1000L);
        String payload = "GT-A1B2C3D4:10:20:" + oldTimestamp;
        // Sign using reflection helper or private method
        try {
            java.lang.reflect.Method signMethod = QrCodeService.class.getDeclaredMethod("sign", String.class);
            signMethod.setAccessible(true);
            String sig = (String) signMethod.invoke(qrCodeService, payload);
            String expiredToken = "GT_PASS:" + payload + ":" + sig;
            assertFalse(qrCodeService.verifyPassToken(expiredToken));
        } catch (Exception e) {
            fail("Reflection failure: " + e.getMessage());
        }
    }

    @Test
    @DisplayName("verifyPassToken returns false for future clock-skew token (> 5 min future)")
    void testVerifyPassTokenFutureClockDrift() {
        long futureTimestamp = System.currentTimeMillis() + (10 * 60 * 1000L); // 10 mins ahead
        String payload = "GT-A1B2C3D4:10:20:" + futureTimestamp;
        try {
            java.lang.reflect.Method signMethod = QrCodeService.class.getDeclaredMethod("sign", String.class);
            signMethod.setAccessible(true);
            String sig = (String) signMethod.invoke(qrCodeService, payload);
            String futureToken = "GT_PASS:" + payload + ":" + sig;
            assertFalse(qrCodeService.verifyPassToken(futureToken));
        } catch (Exception e) {
            fail("Reflection failure: " + e.getMessage());
        }
    }

    @Test
    @DisplayName("generateQrCodeImage produces valid PNG bytes")
    void testGenerateQrCodeImage() throws Exception {
        byte[] imageBytes = qrCodeService.generateQrCodeImage("https://globetrotter.com/verify/GT-123", 200, 200);

        assertNotNull(imageBytes);
        assertTrue(imageBytes.length > 100);
        // PNG magic header: 0x89, 'P', 'N', 'G' (in signed bytes: -119, 80, 78, 71)
        assertEquals((byte) 0x89, imageBytes[0]);
        assertEquals((byte) 'P', imageBytes[1]);
        assertEquals((byte) 'N', imageBytes[2]);
        assertEquals((byte) 'G', imageBytes[3]);
    }
}

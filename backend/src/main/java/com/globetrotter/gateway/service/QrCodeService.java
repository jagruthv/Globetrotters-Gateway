package com.globetrotter.gateway.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;

@Service
public class QrCodeService {

    @Value("${app.qr.hmac-secret:globetrotter-secret-salt-key-2026-high-scale}")
    private String hmacSecret;

    public byte[] generateQrCodeImage(String text, int width, int height) throws Exception {
        QRCodeWriter qrCodeWriter = new QRCodeWriter();
        BitMatrix bitMatrix = qrCodeWriter.encode(text, BarcodeFormat.QR_CODE, width, height);

        ByteArrayOutputStream pngOutputStream = new ByteArrayOutputStream();
        MatrixToImageWriter.writeToStream(bitMatrix, "PNG", pngOutputStream);
        return pngOutputStream.toByteArray();
    }

    public String generateSignedPassToken(String bookingReference, Long circuitId, Long userId) {
        long timestamp = System.currentTimeMillis();
        String payload = bookingReference + ":" + circuitId + ":" + userId + ":" + timestamp;
        String signature = sign(payload);
        return "GT_PASS:" + payload + ":" + signature;
    }

    public boolean verifyPassToken(String token) {
        if (token == null || !token.startsWith("GT_PASS:")) {
            return false;
        }

        String[] parts = token.split(":");
        if (parts.length != 6) {
            return false;
        }

        String payload = parts[1] + ":" + parts[2] + ":" + parts[3] + ":" + parts[4];
        String expectedSignature = parts[5];
        String actualSignature = sign(payload);

        // Constant-time signature comparison to eliminate side-channel timing attacks
        boolean signatureValid = MessageDigest.isEqual(
                expectedSignature.getBytes(StandardCharsets.UTF_8),
                actualSignature.getBytes(StandardCharsets.UTF_8)
        );

        if (!signatureValid) {
            return false;
        }

        // Anti-Replay & Expiry Check (Capstoned Week 7 Paper Truth)
        try {
            long tokenTimestamp = Long.parseLong(parts[4]);
            long now = System.currentTimeMillis();
            // Clock skew tolerance: reject tokens dated > 5 minutes in the future
            if (tokenTimestamp > now + (5 * 60 * 1000L)) {
                return false;
            }
            // Max validity window: 30 days (prevents indefinite reuse of obsolete tokens)
            long maxValidityMs = 30L * 24 * 60 * 60 * 1000L;
            if (now - tokenTimestamp > maxValidityMs) {
                return false;
            }
        } catch (NumberFormatException e) {
            return false;
        }

        return true;
    }

    private String sign(String data) {
        try {
            Mac sha256Hmac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(hmacSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            sha256Hmac.init(secretKey);
            byte[] signedBytes = sha256Hmac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(signedBytes);
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate HMAC signature for pass token", e);
        }
    }
}

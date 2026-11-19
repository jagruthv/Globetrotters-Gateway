package com.globetrotter.gateway.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.globetrotter.gateway.model.Place;
import com.globetrotter.gateway.payload.PoATokenRequest;
import com.globetrotter.gateway.payload.PoAVerificationResponse;
import com.globetrotter.gateway.repository.PlaceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProofOfArrivalService {

    private final PlaceRepository placeRepository;
    private final QrCodeService qrCodeService;
    private final ObjectMapper objectMapper;

    @Value("${gateway.poa.secret:GlobetrotterCartelMitigationSecretKey2026!}")
    private String poaSecret;

    public Map<String, Object> generatePoAToken(PoATokenRequest request) {
        Place place = placeRepository.findById(request.getPlaceId())
                .orElseThrow(() -> new IllegalArgumentException("Place not found with ID: " + request.getPlaceId()));

        int validity = request.getValidityMinutes() != null && request.getValidityMinutes() > 0
                ? request.getValidityMinutes() : 360; // 6 hours default

        Instant now = Instant.now();
        Instant exp = now.plus(validity, ChronoUnit.MINUTES);

        BigDecimal fareCap = request.getCustomizedFareCap();
        if (fareCap == null || fareCap.compareTo(BigDecimal.ZERO) <= 0) {
            fareCap = place.getLastMileCost() != null && place.getLastMileCost().compareTo(BigDecimal.ZERO) > 0
                    ? place.getLastMileCost() : new BigDecimal("200.00");
        }

        String touristName = request.getTouristName() != null && !request.getTouristName().isBlank()
                ? request.getTouristName() : "Verified Tourist";

        Map<String, Object> claims = new HashMap<>();
        claims.put("bid", request.getBookingId());
        claims.put("pid", place.getId());
        claims.put("pname", place.getName());
        claims.put("tname", touristName);
        claims.put("fareCap", fareCap.doubleValue());
        claims.put("iat", now.toEpochMilli());
        claims.put("exp", exp.toEpochMilli());
        claims.put("nonce", UUID.randomUUID().toString().substring(0, 8));

        try {
            String jsonClaims = objectMapper.writeValueAsString(claims);
            String payloadBase64 = Base64.getUrlEncoder().withoutPadding().encodeToString(jsonClaims.getBytes(StandardCharsets.UTF_8));
            String signature = signPayload(payloadBase64);
            String token = "POA_" + payloadBase64 + "." + signature;

            Map<String, Object> result = new HashMap<>();
            result.put("token", token);
            result.put("placeId", place.getId());
            result.put("placeName", place.getName());
            result.put("touristName", touristName);
            result.put("statutoryFareCap", fareCap);
            result.put("transitType", place.getLastMileTransitType());
            result.put("issuedAt", now.toString());
            result.put("expiresAt", exp.toString());
            result.put("legalProtectionNotice", "FAIR FARE BENCHMARK: Official estimated government transit rate is ₹"
                    + fareCap + " per passenger for this route. Tourists can use this benchmark to negotiate fair rates with local operators.");
            return result;
        } catch (Exception e) {
            log.error("Failed to generate PoA token: {}", e.getMessage(), e);
            throw new RuntimeException("Cryptographic Proof-of-Arrival token generation failed", e);
        }
    }

    public PoAVerificationResponse verifyPoAToken(String token) {
        if (token == null || !token.startsWith("POA_") || !token.contains(".")) {
            return PoAVerificationResponse.builder()
                    .valid(false)
                    .status("MALFORMED_TOKEN")
                    .legalNotice("Invalid token format. Missing required cryptographic delimiters.")
                    .build();
        }

        try {
            String cleanToken = token.substring(4); // remove "POA_"
            String[] parts = cleanToken.split("\\.");
            if (parts.length != 2) {
                return PoAVerificationResponse.builder()
                        .valid(false)
                        .status("MALFORMED_TOKEN")
                        .legalNotice("Token structure corrupted.")
                        .build();
            }

            String payloadBase64 = parts[0];
            String receivedSignature = parts[1];

            // 1. Verify HMAC Signature
            String expectedSignature = signPayload(payloadBase64);
            if (!MessageDigest.isEqual(expectedSignature.getBytes(StandardCharsets.UTF_8), receivedSignature.getBytes(StandardCharsets.UTF_8))) {
                log.warn("PoA token signature mismatch. Potential token tampering attempt detected.");
                return PoAVerificationResponse.builder()
                        .valid(false)
                        .status("SIGNATURE_INVALID")
                        .legalNotice("Cryptographic signature mismatch! Token may have been altered or forged.")
                        .build();
            }

            // 2. Decode claims
            byte[] decodedBytes = Base64.getUrlDecoder().decode(payloadBase64);
            Map<String, Object> claims = objectMapper.readValue(decodedBytes, new TypeReference<Map<String, Object>>() {});

            long expEpoch = ((Number) claims.get("exp")).longValue();
            Instant expiresAt = Instant.ofEpochMilli(expEpoch);
            Instant issuedAt = Instant.ofEpochMilli(((Number) claims.get("iat")).longValue());

            if (Instant.now().isAfter(expiresAt)) {
                return PoAVerificationResponse.builder()
                        .valid(false)
                        .status("TOKEN_EXPIRED")
                        .expiresAt(expiresAt)
                        .legalNotice("Token expired at " + expiresAt + ". Please re-issue voucher through Globetrotter Gateway.")
                        .build();
            }

            Long placeId = ((Number) claims.get("pid")).longValue();
            String placeName = (String) claims.get("pname");
            String touristName = (String) claims.get("tname");
            BigDecimal fareCap = BigDecimal.valueOf(((Number) claims.get("fareCap")).doubleValue());

            Place place = placeRepository.findById(placeId).orElse(null);
            String mandal = place != null ? place.getCity() : "District Jurisdiction";
            String state = place != null ? place.getState() : "Andhra Pradesh / Telangana";
            String transitType = place != null && place.getLastMileTransitType() != null
                    ? place.getLastMileTransitType() : "Authorized Committee Transfer";

            return PoAVerificationResponse.builder()
                    .valid(true)
                    .status("AUTHORIZED_STATUTORY_FARE_CAP")
                    .placeId(placeId)
                    .placeName(placeName)
                    .mandal(mandal)
                    .district(place != null ? place.getAddress() : mandal)
                    .state(state)
                    .touristName(touristName)
                    .statutoryFareCap(fareCap)
                    .transitType(transitType)
                    .issuedAt(issuedAt)
                    .expiresAt(expiresAt)
                    .committeeBylawClause("Clause 14-B of Regional Tourism & Motor Vehicle Bylaws: Operators must accept statutory voucher cap of ₹"
                            + fareCap + " per passenger. Overcharging attracts license suspension.")
                    .legalNotice("OFFICIAL VALIDATION PASSED: Tourist is certified by Globetrotter Gateway. Offline checkpoint scanners confirm cryptographic authenticity.")
                    .build();

        } catch (Exception e) {
            log.error("Failed to verify PoA token: {}", e.getMessage(), e);
            return PoAVerificationResponse.builder()
                    .valid(false)
                    .status("INTERNAL_VERIFICATION_ERROR")
                    .legalNotice("Verification error: " + e.getMessage())
                    .build();
        }
    }

    public byte[] generatePoAQrCode(String token) throws Exception {
        return qrCodeService.generateQrCodeImage(token, 300, 300);
    }

    private String signPayload(String payload) {
        try {
            Mac sha256Hmac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(poaSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            sha256Hmac.init(secretKey);
            byte[] signedBytes = sha256Hmac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(signedBytes);
        } catch (Exception e) {
            throw new RuntimeException("HMAC-SHA256 signing failed", e);
        }
    }
}

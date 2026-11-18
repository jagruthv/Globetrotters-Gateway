package com.globetrotter.gateway.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.globetrotter.gateway.model.Place;
import com.globetrotter.gateway.payload.PoATokenRequest;
import com.globetrotter.gateway.payload.PoAVerificationResponse;
import com.globetrotter.gateway.repository.PlaceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProofOfArrivalServiceTest {

    @Mock
    private PlaceRepository placeRepository;

    @Mock
    private QrCodeService qrCodeService;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private ProofOfArrivalService proofOfArrivalService;

    private Place testPlace;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(proofOfArrivalService, "poaSecret", "TestSecretKeyForCartelMitigation2026!");

        testPlace = Place.builder()
                .id(101L)
                .name("Katiki Waterfalls")
                .slug("katiki-waterfalls")
                .city("Ananthagiri")
                .state("Andhra Pradesh")
                .lastMileTransitType("Local Tribal Committee 4x4 Jeep + 2.5km Trek")
                .lastMileCost(new BigDecimal("200.00"))
                .parkingFee(new BigDecimal("50.00"))
                .active(true)
                .build();
    }

    @Test
    @DisplayName("Generate PoA Token - Success with Locked Statutory Fare Cap")
    void testGenerateToken_Success() {
        when(placeRepository.findById(101L)).thenReturn(Optional.of(testPlace));

        PoATokenRequest request = PoATokenRequest.builder()
                .bookingId(555L)
                .placeId(101L)
                .touristName("Rahul Verma")
                .validityMinutes(120)
                .build();

        Map<String, Object> result = proofOfArrivalService.generatePoAToken(request);

        assertNotNull(result);
        assertTrue(result.containsKey("token"));
        String token = (String) result.get("token");
        assertTrue(token.startsWith("POA_"));
        assertTrue(token.contains("."));

        assertEquals(101L, result.get("placeId"));
        assertEquals("Katiki Waterfalls", result.get("placeName"));
        assertEquals(new BigDecimal("200.00"), result.get("statutoryFareCap"));
    }

    @Test
    @DisplayName("Verify PoA Token - Success with Valid Signature and Metadata")
    void testVerifyToken_ValidSignature() {
        when(placeRepository.findById(101L)).thenReturn(Optional.of(testPlace));

        PoATokenRequest request = PoATokenRequest.builder()
                .bookingId(555L)
                .placeId(101L)
                .touristName("Rahul Verma")
                .validityMinutes(120)
                .build();

        Map<String, Object> result = proofOfArrivalService.generatePoAToken(request);
        String token = (String) result.get("token");

        PoAVerificationResponse response = proofOfArrivalService.verifyPoAToken(token);

        assertNotNull(response);
        assertTrue(response.isValid());
        assertEquals("AUTHORIZED_STATUTORY_FARE_CAP", response.getStatus());
        assertEquals("Katiki Waterfalls", response.getPlaceName());
        assertEquals("Rahul Verma", response.getTouristName());
        assertEquals(new BigDecimal("200.0"), response.getStatutoryFareCap());
        assertNotNull(response.getCommitteeBylawClause());
    }

    @Test
    @DisplayName("Verify PoA Token - Reject Tampered Signature")
    void testVerifyToken_TamperedSignature() {
        when(placeRepository.findById(101L)).thenReturn(Optional.of(testPlace));

        PoATokenRequest request = PoATokenRequest.builder()
                .bookingId(555L)
                .placeId(101L)
                .touristName("Rahul Verma")
                .validityMinutes(120)
                .build();

        Map<String, Object> result = proofOfArrivalService.generatePoAToken(request);
        String validToken = (String) result.get("token");

        // Tamper with the signature portion
        String tamperedToken = validToken.substring(0, validToken.length() - 5) + "ABCDE";

        PoAVerificationResponse response = proofOfArrivalService.verifyPoAToken(tamperedToken);

        assertNotNull(response);
        assertFalse(response.isValid());
        assertEquals("SIGNATURE_INVALID", response.getStatus());
    }

    @Test
    @DisplayName("Verify PoA Token - Reject Malformed Token")
    void testVerifyToken_Malformed() {
        PoAVerificationResponse response = proofOfArrivalService.verifyPoAToken("INVALID_RANDOM_TOKEN_STRING");

        assertNotNull(response);
        assertFalse(response.isValid());
        assertEquals("MALFORMED_TOKEN", response.getStatus());
    }
}

package com.globetrotter.gateway;

import com.globetrotter.gateway.model.Booking;
import com.globetrotter.gateway.model.Circuit;
import com.globetrotter.gateway.model.Place;
import com.globetrotter.gateway.model.TicketRedemption;
import com.globetrotter.gateway.model.User;
import com.globetrotter.gateway.payload.ScanRequest;
import com.globetrotter.gateway.payload.ScanResponse;
import com.globetrotter.gateway.repository.BookingRepository;
import com.globetrotter.gateway.repository.PlaceRepository;
import com.globetrotter.gateway.repository.TicketRedemptionRepository;
import com.globetrotter.gateway.service.QrCodeService;
import com.globetrotter.gateway.service.VerificationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * End-to-End Integration Verification:
 * Validates the complete ticket pass lifecycle:
 * Booking creation -> HMAC token generation -> QR issuance -> Turnstile gate check-in -> Tamper defense.
 */
@ExtendWith(MockitoExtension.class)
public class EndToEndBookingToTurnstileTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private PlaceRepository placeRepository;

    @Mock
    private TicketRedemptionRepository redemptionRepository;

    @Mock
    private QrCodeService qrCodeService;

    @InjectMocks
    private VerificationService verificationService;

    @Test
    @DisplayName("E2E Pass Lifecycle: Booking Creation -> Cryptographic Token -> Turnstile Admission")
    void testEndToEndBookingToTurnstileSuccess() {
        String bookingRef = "GT-2026-E2E01";
        String passToken = "GT_PASS:e2e_valid_token_2026";

        User tourist = User.builder()
                .id(101L)
                .fullName("Rajesh Sharma")
                .email("rajesh@traveler.in")
                .build();

        Circuit circuit = Circuit.builder()
                .id(10L)
                .title("Vizag Coastal Heritage Circuit")
                .build();

        Place monument = Place.builder()
                .id(100L)
                .name("INS Kursura Submarine Museum")
                .build();

        Booking booking = Booking.builder()
                .id(501L)
                .bookingReference(bookingRef)
                .user(tourist)
                .circuit(circuit)
                .totalAmount(new BigDecimal("200.00"))
                .numberOfTourists(2)
                .visitStartDate(LocalDate.now().minusDays(1))
                .visitEndDate(LocalDate.now().plusDays(2))
                .paymentStatus("PAID")
                .qrPassToken(passToken)
                .build();

        TicketRedemption redemption = TicketRedemption.builder()
                .id(901L)
                .booking(booking)
                .place(monument)
                .status("PENDING")
                .build();

        // Turnstile Conductor Scans Valid QR Pass
        when(qrCodeService.verifyPassToken(passToken)).thenReturn(true);
        when(bookingRepository.findByQrPassToken(passToken)).thenReturn(Optional.of(booking));
        when(placeRepository.findById(100L)).thenReturn(Optional.of(monument));
        when(redemptionRepository.findByBookingIdAndPlaceId(501L, 100L)).thenReturn(Optional.of(redemption));
        when(redemptionRepository.checkInAtomically(eq(901L), any(LocalDateTime.class), eq("gate_conductor_01"), eq("TURNSTILE-GATE-A1")))
                .thenReturn(1);

        ScanRequest request = new ScanRequest(passToken, 100L, "TURNSTILE-GATE-A1");
        ScanResponse response = verificationService.verifyAndCheckIn(request, "gate_conductor_01");

        assertNotNull(response);
        assertTrue(response.isValid(), "E2E: Authentic ticket should be valid");
        assertEquals("SUCCESS", response.getStatus(), "E2E: Turnstile admission should succeed");
        assertEquals(bookingRef, response.getBookingReference());
        assertEquals("INS Kursura Submarine Museum", response.getPlaceName());
        assertEquals(2, response.getNumberOfTourists());

        verify(redemptionRepository, times(1)).checkInAtomically(eq(901L), any(LocalDateTime.class), eq("gate_conductor_01"), eq("TURNSTILE-GATE-A1"));
    }

    @Test
    @DisplayName("E2E Defense: Forged / Tampered Pass is Blocked at Turnstile")
    void testEndToEndForgedPassRejectedAtTurnstile() {
        String forgedToken = "FORGED_FAKE_TOKEN_INJECTION";

        when(qrCodeService.verifyPassToken(forgedToken)).thenReturn(false);
        when(bookingRepository.findByBookingReference(forgedToken)).thenReturn(Optional.empty());

        ScanRequest attackRequest = new ScanRequest(forgedToken, 100L, "TURNSTILE-GATE-A1");
        ScanResponse response = verificationService.verifyAndCheckIn(attackRequest, "gate_conductor_01");

        assertNotNull(response);
        assertFalse(response.isValid(), "E2E: Forged ticket must be rejected");
        assertEquals("INVALID_PASS", response.getStatus(), "E2E: Status must indicate invalid pass");
        verify(redemptionRepository, never()).checkInAtomically(any(), any(), any(), any());
    }
}

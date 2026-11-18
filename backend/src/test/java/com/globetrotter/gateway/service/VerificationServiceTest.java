package com.globetrotter.gateway.service;

import com.globetrotter.gateway.model.*;
import com.globetrotter.gateway.payload.ScanRequest;
import com.globetrotter.gateway.payload.ScanResponse;
import com.globetrotter.gateway.repository.BookingRepository;
import com.globetrotter.gateway.repository.PlaceRepository;
import com.globetrotter.gateway.repository.TicketRedemptionRepository;
import org.junit.jupiter.api.BeforeEach;
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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VerificationServiceTest {

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

    private User sampleUser;
    private Circuit sampleCircuit;
    private Place samplePlace;
    private Booking sampleBooking;
    private TicketRedemption sampleRedemption;

    @BeforeEach
    void setUp() {
        sampleUser = User.builder()
                .id(1L)
                .email("tourist@test.com")
                .fullName("Rajesh Sharma")
                .build();

        sampleCircuit = Circuit.builder()
                .id(10L)
                .title("Vizag Heritage Circuit")
                .build();

        samplePlace = Place.builder()
                .id(100L)
                .name("INS Kursura Submarine Museum")
                .build();

        sampleBooking = Booking.builder()
                .id(50L)
                .bookingReference("GT-ABC12345")
                .user(sampleUser)
                .circuit(sampleCircuit)
                .totalAmount(new BigDecimal("598.00"))
                .numberOfTourists(2)
                .visitStartDate(LocalDate.now().minusDays(1))
                .visitEndDate(LocalDate.now().plusDays(2))
                .paymentStatus("PAID")
                .qrPassToken("GT_PASS:valid_token")
                .build();

        sampleRedemption = TicketRedemption.builder()
                .id(500L)
                .booking(sampleBooking)
                .place(samplePlace)
                .status("PENDING")
                .build();
    }

    @Test
    @DisplayName("Reject if QR pass token signature is invalid")
    void testInvalidTokenSignature() {
        when(qrCodeService.verifyPassToken("INVALID_TOKEN")).thenReturn(false);
        when(bookingRepository.findByBookingReference("INVALID_TOKEN")).thenReturn(Optional.empty());

        ScanRequest request = new ScanRequest("INVALID_TOKEN", 100L, "Gate-1");
        ScanResponse response = verificationService.verifyAndCheckIn(request, "staffUser");

        assertFalse(response.isValid());
        assertEquals("INVALID_PASS", response.getStatus());
        assertTrue(response.getMessage().contains("Security Alert"));
    }

    @Test
    @DisplayName("Reject if booking is not found by token")
    void testBookingNotFound() {
        when(qrCodeService.verifyPassToken("GT_PASS:valid_token")).thenReturn(true);
        when(bookingRepository.findByQrPassToken("GT_PASS:valid_token")).thenReturn(Optional.empty());

        ScanRequest request = new ScanRequest("GT_PASS:valid_token", 100L, "Gate-1");
        ScanResponse response = verificationService.verifyAndCheckIn(request, "staffUser");

        assertFalse(response.isValid());
        assertEquals("INVALID_PASS", response.getStatus());
    }

    @Test
    @DisplayName("Reject if booking payment is PENDING (unpaid pass)")
    void testRejectUnpaidBooking() {
        sampleBooking.setPaymentStatus("PENDING");

        when(qrCodeService.verifyPassToken("GT_PASS:valid_token")).thenReturn(true);
        when(bookingRepository.findByQrPassToken("GT_PASS:valid_token")).thenReturn(Optional.of(sampleBooking));

        ScanRequest request = new ScanRequest("GT_PASS:valid_token", 100L, "Gate-1");
        ScanResponse response = verificationService.verifyAndCheckIn(request, "staffUser");

        assertFalse(response.isValid());
        assertEquals("PAYMENT_PENDING", response.getStatus());
        assertTrue(response.getMessage().contains("Payment not completed"));
    }

    @Test
    @DisplayName("Reject if pass is expired")
    void testRejectExpiredPass() {
        sampleBooking.setVisitStartDate(LocalDate.now().minusDays(5));
        sampleBooking.setVisitEndDate(LocalDate.now().minusDays(1)); // Expired yesterday

        when(qrCodeService.verifyPassToken("GT_PASS:valid_token")).thenReturn(true);
        when(bookingRepository.findByQrPassToken("GT_PASS:valid_token")).thenReturn(Optional.of(sampleBooking));

        ScanRequest request = new ScanRequest("GT_PASS:valid_token", 100L, "Gate-1");
        ScanResponse response = verificationService.verifyAndCheckIn(request, "staffUser");

        assertFalse(response.isValid());
        assertEquals("EXPIRED", response.getStatus());
    }

    @Test
    @DisplayName("Reject if place is not included in the booked circuit")
    void testRejectPlaceNotInCircuit() {
        when(qrCodeService.verifyPassToken("GT_PASS:valid_token")).thenReturn(true);
        when(bookingRepository.findByQrPassToken("GT_PASS:valid_token")).thenReturn(Optional.of(sampleBooking));
        when(placeRepository.findById(999L)).thenReturn(Optional.of(samplePlace));
        when(redemptionRepository.findByBookingIdAndPlaceId(50L, 999L)).thenReturn(Optional.empty());

        ScanRequest request = new ScanRequest("GT_PASS:valid_token", 999L, "Gate-1");
        ScanResponse response = verificationService.verifyAndCheckIn(request, "staffUser");

        assertFalse(response.isValid());
        assertEquals("PLACE_NOT_IN_CIRCUIT", response.getStatus());
    }

    @Test
    @DisplayName("Reject duplicate scan when ticket already checked in")
    void testRejectDuplicateCheckIn() {
        sampleRedemption.setStatus("CHECKED_IN");
        sampleRedemption.setCheckedInAt(LocalDateTime.now().minusHours(2));

        when(qrCodeService.verifyPassToken("GT_PASS:valid_token")).thenReturn(true);
        when(bookingRepository.findByQrPassToken("GT_PASS:valid_token")).thenReturn(Optional.of(sampleBooking));
        when(placeRepository.findById(100L)).thenReturn(Optional.of(samplePlace));
        when(redemptionRepository.findByBookingIdAndPlaceId(50L, 100L)).thenReturn(Optional.of(sampleRedemption));

        ScanRequest request = new ScanRequest("GT_PASS:valid_token", 100L, "Gate-1");
        ScanResponse response = verificationService.verifyAndCheckIn(request, "staffUser");

        assertFalse(response.isValid());
        assertEquals("ALREADY_CHECKED_IN", response.getStatus());
        assertTrue(response.getMessage().contains("already redeemed"));
    }

    @Test
    @DisplayName("Approve check-in and update status to CHECKED_IN")
    void testSuccessfulCheckIn() {
        when(qrCodeService.verifyPassToken("GT_PASS:valid_token")).thenReturn(true);
        when(bookingRepository.findByQrPassToken("GT_PASS:valid_token")).thenReturn(Optional.of(sampleBooking));
        when(placeRepository.findById(100L)).thenReturn(Optional.of(samplePlace));
        when(redemptionRepository.findByBookingIdAndPlaceId(50L, 100L)).thenReturn(Optional.of(sampleRedemption));
        when(redemptionRepository.checkInAtomically(eq(500L), any(LocalDateTime.class), eq("staff_kavitha"), eq("Gate-Submarine-North")))
                .thenReturn(1);

        ScanRequest request = new ScanRequest("GT_PASS:valid_token", 100L, "Gate-Submarine-North");
        ScanResponse response = verificationService.verifyAndCheckIn(request, "staff_kavitha");

        assertTrue(response.isValid());
        assertEquals("SUCCESS", response.getStatus());
        assertEquals("GT-ABC12345", response.getBookingReference());
        assertEquals("INS Kursura Submarine Museum", response.getPlaceName());
        assertEquals(2, response.getNumberOfTourists());

        // Verify atomic check-in method was called
        verify(redemptionRepository, times(1)).checkInAtomically(eq(500L), any(LocalDateTime.class), eq("staff_kavitha"), eq("Gate-Submarine-North"));
    }

    @Test
    @DisplayName("Reject when concurrent scan wins the race (checkInAtomically returns 0)")
    void testConcurrentRaceConditionBlocked() {
        when(qrCodeService.verifyPassToken("GT_PASS:valid_token")).thenReturn(true);
        when(bookingRepository.findByQrPassToken("GT_PASS:valid_token")).thenReturn(Optional.of(sampleBooking));
        when(placeRepository.findById(100L)).thenReturn(Optional.of(samplePlace));
        when(redemptionRepository.findByBookingIdAndPlaceId(50L, 100L)).thenReturn(Optional.of(sampleRedemption));
        when(redemptionRepository.checkInAtomically(any(), any(), any(), any())).thenReturn(0);

        ScanRequest request = new ScanRequest("GT_PASS:valid_token", 100L, "Gate-Turnstile-2");
        ScanResponse response = verificationService.verifyAndCheckIn(request, "staff_two");

        assertFalse(response.isValid());
        assertEquals("ALREADY_CHECKED_IN", response.getStatus());
        assertTrue(response.getMessage().contains("duplicate concurrent entry detected"));
    }
}

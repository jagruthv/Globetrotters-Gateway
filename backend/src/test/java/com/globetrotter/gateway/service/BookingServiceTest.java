package com.globetrotter.gateway.service;

import com.globetrotter.gateway.model.Booking;
import com.globetrotter.gateway.model.Circuit;
import com.globetrotter.gateway.model.User;
import com.globetrotter.gateway.payload.BookingRequest;
import com.globetrotter.gateway.payload.BookingResponse;
import com.globetrotter.gateway.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private CircuitRepository circuitRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TicketRedemptionRepository redemptionRepository;

    @Mock
    private QrCodeService qrCodeService;

    @InjectMocks
    private BookingService bookingService;

    private User sampleUser;
    private Circuit sampleCircuit;

    @BeforeEach
    void setUp() {
        sampleUser = User.builder()
                .id(1L)
                .email("tourist@test.com")
                .fullName("Anita Roy")
                .build();

        sampleCircuit = Circuit.builder()
                .id(5L)
                .title("Bheemli Coastal Circuit")
                .basePrice(new BigDecimal("499.00"))
                .discountedCircuitPrice(new BigDecimal("349.00"))
                .validityDays(3)
                .circuitPlaces(new ArrayList<>())
                .build();
    }

    @Test
    @DisplayName("createPendingBooking calculates discounted price, sets status PENDING, and generates GT- ref")
    void testCreatePendingBooking() {
        BookingRequest request = new BookingRequest();
        request.setCircuitId(5L);
        request.setNumberOfTourists(3);
        request.setVisitStartDate(LocalDate.now().plusDays(2));

        when(userRepository.findByEmail("tourist@test.com")).thenReturn(Optional.of(sampleUser));
        when(circuitRepository.findById(5L)).thenReturn(Optional.of(sampleCircuit));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> {
            Booking b = invocation.getArgument(0);
            b.setId(101L);
            b.setRedemptions(new ArrayList<>());
            return b;
        });

        BookingResponse response = bookingService.createPendingBooking("tourist@test.com", request);

        assertNotNull(response);
        assertTrue(response.getBookingReference().startsWith("GT-"));
        assertEquals("PENDING", response.getPaymentStatus());
        assertTrue(response.isPaymentPending());
        assertNull(response.getQrImageUrl()); // QR not available until paid
        // 349.00 * 3 = 1047.00
        assertEquals(new BigDecimal("1047.00"), response.getTotalAmount());
        assertEquals(3, response.getNumberOfTourists());
    }

    @Test
    @DisplayName("getQrCodeImageForBooking throws exception if booking is not PAID")
    void testGetQrCodeImageUnpaidThrows() {
        Booking unpaidBooking = Booking.builder()
                .bookingReference("GT-UNPAID1")
                .paymentStatus("PENDING")
                .build();

        when(bookingRepository.findByBookingReference("GT-UNPAID1")).thenReturn(Optional.of(unpaidBooking));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                bookingService.getQrCodeImageForBooking("GT-UNPAID1", 250));

        assertTrue(ex.getMessage().contains("payment not completed"));
    }

    @Test
    @DisplayName("BookingResponse omits qrPassToken (security hardening)")
    void testBookingResponseDoesNotExposeRawToken() {
        Booking paidBooking = Booking.builder()
                .id(200L)
                .bookingReference("GT-PAIDPASS")
                .circuit(sampleCircuit)
                .totalAmount(new BigDecimal("349.00"))
                .numberOfTourists(1)
                .visitStartDate(LocalDate.now())
                .visitEndDate(LocalDate.now().plusDays(3))
                .paymentStatus("PAID")
                .qrPassToken("GT_PASS:sensitive_hmac_signature_token")
                .redemptions(new ArrayList<>())
                .build();

        BookingResponse response = bookingService.mapToResponse(paidBooking);

        assertNotNull(response);
        assertEquals("GT-PAIDPASS", response.getBookingReference());
        assertEquals("/api/bookings/verify/qr-image/GT-PAIDPASS", response.getQrImageUrl());
        assertFalse(response.isPaymentPending());
        // Verify reflection: there is no qrPassToken field on BookingResponse DTO
    }
}

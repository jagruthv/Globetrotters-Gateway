package com.globetrotter.gateway.service;

import com.globetrotter.gateway.model.*;
import com.globetrotter.gateway.payload.BookingRequest;
import com.globetrotter.gateway.payload.BookingResponse;
import com.globetrotter.gateway.repository.BookingRepository;
import com.globetrotter.gateway.repository.CircuitRepository;
import com.globetrotter.gateway.repository.TicketRedemptionRepository;
import com.globetrotter.gateway.repository.UserRepository;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final CircuitRepository circuitRepository;
    private final UserRepository userRepository;
    private final TicketRedemptionRepository redemptionRepository;
    private final QrCodeService qrCodeService;
    private final MailService mailService;
    private final CircuitPassService circuitPassService;

    /**
     * Creates a PENDING booking with no QR token.
     * QR is generated only after payment is verified via PaymentService.
     * Called from the checkout flow before Razorpay payment opens.
     */
    @Transactional
    public BookingResponse createPendingBooking(String userEmail, BookingRequest request) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userEmail));

        Circuit circuit = circuitRepository.findById(request.getCircuitId())
                .orElseThrow(() -> new IllegalArgumentException("Circuit not found: " + request.getCircuitId()));

        BigDecimal pricePerPerson = circuit.getDiscountedCircuitPrice() != null
                ? circuit.getDiscountedCircuitPrice()
                : circuit.getBasePrice();
        BigDecimal totalAmount = pricePerPerson.multiply(BigDecimal.valueOf(request.getNumberOfTourists()));

        String bookingReference = generateBookingReference();

        LocalDate startDate = request.getVisitStartDate();
        LocalDate endDate = startDate.plusDays(circuit.getValidityDays() != null ? circuit.getValidityDays() : 3);

        // No qrPassToken or redemptions created yet — payment must complete first
        Booking booking = Booking.builder()
                .bookingReference(bookingReference)
                .user(user)
                .circuit(circuit)
                .totalAmount(totalAmount)
                .numberOfTourists(request.getNumberOfTourists())
                .visitStartDate(startDate)
                .visitEndDate(endDate)
                .paymentStatus("PENDING")
                .qrPassToken("PENDING_PAYMENT_" + bookingReference) // Placeholder — replaced after payment
                .build();

        Booking savedBooking = bookingRepository.save(booking);
        return mapToResponse(savedBooking);
    }

    /**
     * Legacy method — creates a booking as fully PAID (used for DataInitializer demo data only).
     * DO NOT use in the production booking flow.
     */
    @Transactional
    public BookingResponse createBooking(String userEmail, BookingRequest request) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userEmail));

        Circuit circuit = circuitRepository.findById(request.getCircuitId())
                .orElseThrow(() -> new IllegalArgumentException("Circuit not found: " + request.getCircuitId()));

        BigDecimal pricePerPerson = circuit.getDiscountedCircuitPrice() != null
                ? circuit.getDiscountedCircuitPrice()
                : circuit.getBasePrice();
        BigDecimal totalAmount = pricePerPerson.multiply(BigDecimal.valueOf(request.getNumberOfTourists()));

        String bookingReference = generateBookingReference();
        String passToken = qrCodeService.generateSignedPassToken(bookingReference, circuit.getId(), user.getId());

        LocalDate startDate = request.getVisitStartDate();
        LocalDate endDate = startDate.plusDays(circuit.getValidityDays() != null ? circuit.getValidityDays() : 3);

        Booking booking = Booking.builder()
                .bookingReference(bookingReference)
                .user(user)
                .circuit(circuit)
                .totalAmount(totalAmount)
                .numberOfTourists(request.getNumberOfTourists())
                .visitStartDate(startDate)
                .visitEndDate(endDate)
                .paymentStatus("PAID")
                .qrPassToken(passToken)
                .build();

        Booking savedBooking = bookingRepository.save(booking);

        // Pre-create redemption slots immediately for demo bookings
        for (CircuitPlace cp : circuit.getCircuitPlaces()) {
            TicketRedemption redemption = TicketRedemption.builder()
                    .booking(savedBooking)
                    .place(cp.getPlace())
                    .status("PENDING")
                    .build();
            redemptionRepository.save(redemption);
            savedBooking.getRedemptions().add(redemption);
        }

        // Create CircuitPass and PassLocations for the new architecture
        circuitPassService.createCircuitPassForBooking(savedBooking);

        // Dispatch email confirmation receipt with inline QR pass
        if ("PAID".equals(savedBooking.getPaymentStatus()) && savedBooking.getUser() != null) {
            mailService.sendBookingConfirmation(savedBooking);
        }

        return mapToResponse(savedBooking);
    }

    public List<BookingResponse> getUserBookings(String userEmail) {
        return bookingRepository.findByUserEmailOrderByCreatedAtDesc(userEmail)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public BookingResponse getBookingByReference(String reference) {
        Booking booking = bookingRepository.findByBookingReference(reference)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + reference));
        return mapToResponse(booking);
    }

    public BookingResponse getBookingByReferenceForUser(String reference, String requestingEmail, boolean isAdmin) {
        Booking booking = bookingRepository.findByBookingReference(reference)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + reference));

        if (!isAdmin && (booking.getUser() == null || !booking.getUser().getEmail().equalsIgnoreCase(requestingEmail))) {
            throw new org.springframework.security.access.AccessDeniedException("You are not authorized to view this booking pass.");
        }

        return mapToResponse(booking);
    }

    public BookingResponse getBookingByToken(String passToken) {
        Booking booking = bookingRepository.findByQrPassToken(passToken)
                .orElseGet(() -> bookingRepository.findByBookingReference(passToken)
                        .orElseThrow(() -> new IllegalArgumentException("Booking not found for token: " + passToken)));
        return mapToResponse(booking);
    }

    public byte[] getQrCodeImageForBooking(String reference, int size) throws Exception {
        Booking booking = bookingRepository.findByBookingReference(reference)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + reference));

        // Only serve QR image for paid bookings
        if (!"PAID".equals(booking.getPaymentStatus())) {
            throw new IllegalArgumentException("Pass QR code is not available — payment not completed for: " + reference);
        }

        return qrCodeService.generateQrCodeImage(booking.getQrPassToken(), size, size);
    }

    public BookingResponse mapToResponse(Booking booking) {
        List<BookingResponse.RedemptionStatusDTO> redemptionDTOs = booking.getRedemptions().stream()
                .map(r -> BookingResponse.RedemptionStatusDTO.builder()
                        .placeId(r.getPlace().getId())
                        .placeName(r.getPlace().getName())
                        .category(r.getPlace().getCategory())
                        .address(r.getPlace().getAddress())
                        .openingTime(r.getPlace().getOpeningTime())
                        .closingTime(r.getPlace().getClosingTime())
                        .status(r.getStatus())
                        .checkedInAt(r.getCheckedInAt())
                        .build())
                .collect(Collectors.toList());

        boolean isPending = "PENDING".equals(booking.getPaymentStatus());

        return BookingResponse.builder()
                .id(booking.getId())
                .bookingReference(booking.getBookingReference())
                .circuitId(booking.getCircuit().getId())
                .circuitTitle(booking.getCircuit().getTitle())
                .circuitBannerImage(booking.getCircuit().getBannerImage())
                .totalAmount(booking.getTotalAmount())
                .numberOfTourists(booking.getNumberOfTourists())
                .visitStartDate(booking.getVisitStartDate())
                .visitEndDate(booking.getVisitEndDate())
                .paymentStatus(booking.getPaymentStatus())
                .paymentPending(isPending)
                // NOTE: qrPassToken is intentionally NOT included in the response (security)
                // qrImageUrl is only useful when PAID — null for PENDING bookings
                .qrImageUrl(isPending ? null : "/api/bookings/verify/qr-image/" + booking.getBookingReference())
                .createdAt(booking.getCreatedAt())
                .redemptions(redemptionDTOs)
                .build();
    }

    /**
     * Collision-proof booking reference using UUID.
     * Format: GT-A3F7B2C1 (8 uppercase hex chars = 4 billion combinations)
     */
    private String generateBookingReference() {
        String uuid = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        return "GT-" + uuid;
    }

    /**
     * Wrapper returned by PaymentService after payment confirmation.
     * Carries the confirmed Booking and a flag indicating if it was newly confirmed.
     */
    @Data
    @AllArgsConstructor
    public static class BookingConfirmResult {
        private Booking booking;
        private boolean newlyConfirmed;
    }
}


package com.globetrotter.gateway.service;

import com.globetrotter.gateway.model.Booking;
import com.globetrotter.gateway.model.Place;
import com.globetrotter.gateway.model.TicketRedemption;
import com.globetrotter.gateway.payload.ScanRequest;
import com.globetrotter.gateway.payload.ScanResponse;
import com.globetrotter.gateway.repository.BookingRepository;
import com.globetrotter.gateway.repository.PlaceRepository;
import com.globetrotter.gateway.repository.TicketRedemptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class VerificationService {

    private final BookingRepository bookingRepository;
    private final PlaceRepository placeRepository;
    private final TicketRedemptionRepository redemptionRepository;
    private final QrCodeService qrCodeService;

    @Transactional
    public ScanResponse verifyAndCheckIn(ScanRequest request, String staffUsername) {
        String token = request.getPassToken();

        // 1. Check if token signature is cryptographically valid
        if (!qrCodeService.verifyPassToken(token)) {
            // Also allow testing by direct booking reference if scanned as text
            Optional<Booking> byRef = bookingRepository.findByBookingReference(token.trim().toUpperCase());
            if (byRef.isPresent()) {
                return processRedemption(byRef.get(), request.getPlaceId(), staffUsername, request.getGateTerminalId());
            }

            return ScanResponse.builder()
                    .valid(false)
                    .status("INVALID_PASS")
                    .message("Security Alert: Invalid or Tampered QR Pass detected!")
                    .build();
        }

        // 2. Locate booking by pass token
        Optional<Booking> bookingOpt = bookingRepository.findByQrPassToken(token);
        if (bookingOpt.isEmpty()) {
            return ScanResponse.builder()
                    .valid(false)
                    .status("INVALID_PASS")
                    .message("No active booking found corresponding to this QR pass.")
                    .build();
        }

        return processRedemption(bookingOpt.get(), request.getPlaceId(), staffUsername, request.getGateTerminalId());
    }

    @Transactional
    public List<ScanResponse> batchSyncOfflineScans(List<ScanRequest> requests, String staffUsername) {
        if (requests == null || requests.isEmpty()) {
            return List.of();
        }
        List<ScanResponse> responses = new java.util.ArrayList<>();
        for (ScanRequest req : requests) {
            try {
                responses.add(verifyAndCheckIn(req, staffUsername));
            } catch (Exception e) {
                responses.add(ScanResponse.builder()
                        .valid(false)
                        .status("SYNC_ERROR")
                        .message("Sync error: " + e.getMessage())
                        .build());
            }
        }
        return responses;
    }

    private ScanResponse processRedemption(Booking booking, Long placeId, String staffUsername, String gateTerminalId) {
        LocalDate today = LocalDate.now();

        // 3. Reject unpaid passes immediately — no entry without confirmed payment
        if (!"PAID".equals(booking.getPaymentStatus())) {
            return ScanResponse.builder()
                    .valid(false)
                    .status("PAYMENT_PENDING")
                    .bookingReference(booking.getBookingReference())
                    .circuitTitle(booking.getCircuit().getTitle())
                    .touristName(booking.getUser().getFullName())
                    .message("Entry Denied: Payment not completed for this pass. Please complete payment first.")
                    .build();
        }

        // 4. Verify date validity
        if (today.isBefore(booking.getVisitStartDate())) {
            return ScanResponse.builder()
                    .valid(false)
                    .status("NOT_YET_VALID")
                    .bookingReference(booking.getBookingReference())
                    .circuitTitle(booking.getCircuit().getTitle())
                    .touristName(booking.getUser().getFullName())
                    .message("Pass is not active yet. Valid starting: " + booking.getVisitStartDate())
                    .build();
        }

        if (today.isAfter(booking.getVisitEndDate())) {
            return ScanResponse.builder()
                    .valid(false)
                    .status("EXPIRED")
                    .bookingReference(booking.getBookingReference())
                    .circuitTitle(booking.getCircuit().getTitle())
                    .touristName(booking.getUser().getFullName())
                    .message("Pass expired on " + booking.getVisitEndDate())
                    .build();
        }

        // 4. Verify attraction place exists
        Optional<Place> placeOpt = placeRepository.findById(placeId);
        if (placeOpt.isEmpty()) {
            return ScanResponse.builder()
                    .valid(false)
                    .status("UNKNOWN_PLACE")
                    .message("Unknown attraction location ID: " + placeId)
                    .build();
        }
        Place place = placeOpt.get();

        // 5. Check if attraction is part of the booked circuit
        Optional<TicketRedemption> redemptionOpt = redemptionRepository.findByBookingIdAndPlaceId(booking.getId(), placeId);
        if (redemptionOpt.isEmpty()) {
            return ScanResponse.builder()
                    .valid(false)
                    .status("PLACE_NOT_IN_CIRCUIT")
                    .bookingReference(booking.getBookingReference())
                    .circuitTitle(booking.getCircuit().getTitle())
                    .placeName(place.getName())
                    .message("Notice: '" + place.getName() + "' is not included in the '" + booking.getCircuit().getTitle() + "' pass.")
                    .build();
        }

        TicketRedemption redemption = redemptionOpt.get();

        // 6. Fast in-memory check for already redeemed passes
        if ("CHECKED_IN".equalsIgnoreCase(redemption.getStatus())) {
            return ScanResponse.builder()
                    .valid(false)
                    .status("ALREADY_CHECKED_IN")
                    .bookingReference(booking.getBookingReference())
                    .circuitTitle(booking.getCircuit().getTitle())
                    .touristName(booking.getUser().getFullName())
                    .placeName(place.getName())
                    .checkedInAt(redemption.getCheckedInAt())
                    .message("Entry Denied: Pass was already redeemed at " + place.getName() + " on " + redemption.getCheckedInAt())
                    .build();
        }

        // 7. Atomic Conditional Check-In
        // Atomically transitions PENDING -> CHECKED_IN. If another gate scanner checked in
        // at the exact same millisecond, checkInAtomically returns 0, blocking the duplicate!
        LocalDateTime now = LocalDateTime.now();
        String terminal = gateTerminalId != null ? gateTerminalId : "Gate-Primary";

        int updatedRows = redemptionRepository.checkInAtomically(redemption.getId(), now, staffUsername, terminal);
        if (updatedRows == 0) {
            return ScanResponse.builder()
                    .valid(false)
                    .status("ALREADY_CHECKED_IN")
                    .bookingReference(booking.getBookingReference())
                    .circuitTitle(booking.getCircuit().getTitle())
                    .touristName(booking.getUser().getFullName())
                    .placeName(place.getName())
                    .checkedInAt(now)
                    .message("Entry Denied: Pass was already redeemed at " + place.getName() + " or duplicate concurrent entry detected.")
                    .build();
        }

        // Update in-memory entity for the return payload
        redemption.setStatus("CHECKED_IN");
        redemption.setCheckedInAt(now);
        redemption.setVerifiedByStaffUsername(staffUsername);
        redemption.setGateTerminalId(terminal);

        return ScanResponse.builder()
                .valid(true)
                .status("SUCCESS")
                .bookingReference(booking.getBookingReference())
                .circuitTitle(booking.getCircuit().getTitle())
                .touristName(booking.getUser().getFullName())
                .numberOfTourists(booking.getNumberOfTourists())
                .placeName(place.getName())
                .checkedInAt(now)
                .message("Entry Approved! Welcome " + booking.getUser().getFullName() + " (" + booking.getNumberOfTourists() + " visitors) to " + place.getName() + ".")
                .build();
    }
}

package com.globetrotter.gateway.controller;

import com.globetrotter.gateway.payload.BookingRequest;
import com.globetrotter.gateway.payload.BookingResponse;
import com.globetrotter.gateway.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    /**
     * Step 1 of the booking flow: creates a PENDING booking.
     * Frontend then calls POST /api/payments/initiate?reference=... to get Razorpay order.
     * QR pass is generated only after payment verification completes.
     */
    @PostMapping("/checkout")
    public ResponseEntity<BookingResponse> checkout(
            Authentication authentication,
            @Valid @RequestBody BookingRequest request
    ) {
        String email = authentication.getName();
        return ResponseEntity.ok(bookingService.createPendingBooking(email, request));
    }

    @GetMapping("/my-passes")
    public ResponseEntity<List<BookingResponse>> getMyPasses(Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(bookingService.getUserBookings(email));
    }

    @GetMapping("/{reference}")
    public ResponseEntity<BookingResponse> getBooking(
            @PathVariable String reference,
            Authentication authentication
    ) {
        boolean isAdmin = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        String email = authentication != null ? authentication.getName() : null;
        return ResponseEntity.ok(bookingService.getBookingByReferenceForUser(reference, email, isAdmin));
    }

    /**
     * Serves the QR code PNG image.
     * - Only available for PAID bookings (BookingService enforces this)
     * - Cache-Control: 1 hour (QR for a booking never changes after payment)
     * - No auth required: tourists show this at the gate on their phone
     */
    @GetMapping(value = "/verify/qr-image/{reference}", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> getQrCodeImage(
            @PathVariable String reference,
            @RequestParam(defaultValue = "350") int size
    ) {
        try {
            byte[] imageBytes = bookingService.getQrCodeImageForBooking(reference, size);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + reference + "-qr.png\"")
                    .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS).cachePublic()) // Cache QR image in browser
                    .body(imageBytes);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}


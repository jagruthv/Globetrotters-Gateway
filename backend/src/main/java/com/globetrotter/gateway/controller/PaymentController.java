package com.globetrotter.gateway.controller;

import com.globetrotter.gateway.payload.PaymentInitiateResponse;
import com.globetrotter.gateway.payload.PaymentVerifyRequest;
import com.globetrotter.gateway.service.BookingService;
import com.globetrotter.gateway.service.PaymentService;
import com.globetrotter.gateway.service.RateLimitingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * PaymentController — handles the full payment lifecycle:
 *
 *   POST /api/payments/initiate?reference=GT-XXXXXXXX
 *     → Creates Razorpay order, returns {orderId, amount, key} to frontend
 *
 *   POST /api/payments/verify
 *     → Verifies Razorpay signature, marks booking PAID, generates QR, sends email
 *
 * Rate limited: 10 payment initiations per user per minute (prevents abuse).
 */
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final BookingService bookingService;
    private final RateLimitingService rateLimitingService;

    // ── 1. Initiate Payment ────────────────────────────────────────────────────
    /**
     * Called when tourist clicks "Book & Pay".
     * Creates a Razorpay order and returns the details needed to open the checkout widget.
     */
    @PostMapping("/initiate")
    public ResponseEntity<?> initiatePayment(
            @RequestParam String reference,
            @AuthenticationPrincipal UserDetails userDetails) {

        // Rate limit check: 10 attempts per minute per user
        if (!rateLimitingService.tryConsumePayment(userDetails.getUsername())) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Too many payment requests. Please wait a moment and try again."));
        }

        PaymentInitiateResponse response = paymentService.initiatePayment(reference, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    // ── 2. Verify Payment ──────────────────────────────────────────────────────
    /**
     * Called from frontend after Razorpay checkout succeeds.
     * Verifies the cryptographic signature and activates the booking.
     */
    @PostMapping("/verify")
    public ResponseEntity<?> verifyPayment(
            @Valid @RequestBody PaymentVerifyRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        // Rate limit check
        if (!rateLimitingService.tryConsumePayment(userDetails.getUsername())) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Too many requests. Please wait a moment."));
        }

        BookingService.BookingConfirmResult result = paymentService.verifyAndConfirmPayment(request, userDetails.getUsername());
        return ResponseEntity.ok(bookingService.mapToResponse(result.getBooking()));
    }
}

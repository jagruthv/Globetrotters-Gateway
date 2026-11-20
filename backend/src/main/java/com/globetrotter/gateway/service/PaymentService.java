package com.globetrotter.gateway.service;

import com.globetrotter.gateway.model.Booking;
import com.globetrotter.gateway.model.CircuitPlace;
import com.globetrotter.gateway.model.TicketRedemption;
import com.globetrotter.gateway.payload.PaymentInitiateResponse;
import com.globetrotter.gateway.payload.PaymentVerifyRequest;
import com.globetrotter.gateway.repository.BookingRepository;
import com.globetrotter.gateway.repository.TicketRedemptionRepository;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

/**
 * PaymentService — handles the full Razorpay payment lifecycle:
 *
 *  initiatePayment()  → creates a Razorpay Order and stores orderId on Booking
 *  verifyPayment()    → cryptographically verifies Razorpay webhook signature,
 *                       marks booking PAID, creates QR redemption slots
 *
 * Flow:
 *  1. Frontend: POST /api/payments/initiate?reference=GT-XXXXX
 *  2. Backend: creates Razorpay order, returns orderId + amount + key to frontend
 *  3. Frontend: opens Razorpay embedded checkout widget
 *  4. User pays inside the widget
 *  5. Frontend: receives {razorpayPaymentId, razorpayOrderId, razorpaySignature}
 *  6. Frontend: POST /api/payments/verify with those 3 values
 *  7. Backend: verifies signature using HMAC-SHA256, marks booking PAID, generates QR slots, sends email
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final BookingRepository bookingRepository;
    private final TicketRedemptionRepository redemptionRepository;
    private final QrCodeService qrCodeService;
    private final MailService mailService;
    private final CircuitPassService circuitPassService;

    @Value("${app.razorpay.key-id:rzp_test_mock_gateway_key}")
    private String razorpayKeyId;

    @Value("${app.razorpay.key-secret:rzp_test_mock_secret_key}")
    private String razorpayKeySecret;

    // ── Step 1: Initiate Payment ───────────────────────────────────────────────

    @Transactional
    public PaymentInitiateResponse initiatePayment(String bookingReference) {
        return initiatePayment(bookingReference, null);
    }

    @Transactional
    public PaymentInitiateResponse initiatePayment(String bookingReference, String requestingUserEmail) {
        Booking booking = bookingRepository.findByBookingReference(bookingReference)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + bookingReference));

        // IDOR Defense: verify requesting user owns this booking pass
        if (requestingUserEmail != null && booking.getUser() != null && !booking.getUser().getEmail().equalsIgnoreCase(requestingUserEmail)) {
            log.warn("IDOR attempt blocked: User {} attempted to initiate payment on booking {} owned by {}",
                    requestingUserEmail, bookingReference, booking.getUser().getEmail());
            throw new org.springframework.security.access.AccessDeniedException("You are not authorized to pay for someone else's booking pass.");
        }

        // Prevent re-initiation if already paid
        if ("PAID".equals(booking.getPaymentStatus())) {
            throw new IllegalArgumentException("Booking " + bookingReference + " is already paid.");
        }

        boolean isDemoMode = razorpayKeyId == null || razorpayKeyId.contains("DEMO") || razorpayKeyId.contains("rzp_test_DEMO");
        if (isDemoMode) {
            String mockOrderId = "order_demo_" + System.currentTimeMillis();
            booking.setRazorpayOrderId(mockOrderId);
            bookingRepository.save(booking);
            log.info("Evaluation/Demo Mode: Generated simulated Razorpay order: {} for booking: {}", mockOrderId, bookingReference);

            return PaymentInitiateResponse.builder()
                    .bookingReference(bookingReference)
                    .razorpayOrderId(mockOrderId)
                    .amount(booking.getTotalAmount())
                    .currency("INR")
                    .razorpayKeyId("rzp_test_DEMO_KEY")
                    .circuitTitle(booking.getCircuit().getTitle())
                    .customerEmail(booking.getUser().getEmail())
                    .customerName(booking.getUser().getFullName())
                    .build();
        }

        try {
            RazorpayClient razorpay = new RazorpayClient(razorpayKeyId, razorpayKeySecret);

            // Razorpay expects amount in PAISE (1 INR = 100 paise)
            int amountInPaise = booking.getTotalAmount().multiply(java.math.BigDecimal.valueOf(100)).intValue();

            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountInPaise);
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", bookingReference);
            orderRequest.put("payment_capture", 1); // Auto-capture payment

            // Add notes for Razorpay dashboard
            JSONObject notes = new JSONObject();
            notes.put("circuit", booking.getCircuit().getTitle());
            notes.put("tourists", booking.getNumberOfTourists());
            notes.put("visit_date", booking.getVisitStartDate().toString());
            orderRequest.put("notes", notes);

            Order order = razorpay.orders.create(orderRequest);
            String razorpayOrderId = order.get("id");

            // Persist the Razorpay order ID so we can verify it later
            booking.setRazorpayOrderId(razorpayOrderId);
            bookingRepository.save(booking);

            log.info("Razorpay order created: {} for booking: {}", razorpayOrderId, bookingReference);

            return PaymentInitiateResponse.builder()
                    .bookingReference(bookingReference)
                    .razorpayOrderId(razorpayOrderId)
                    .amount(booking.getTotalAmount())
                    .currency("INR")
                    .razorpayKeyId(razorpayKeyId) // Public key — safe to expose
                    .circuitTitle(booking.getCircuit().getTitle())
                    .customerEmail(booking.getUser().getEmail())
                    .customerName(booking.getUser().getFullName())
                    .build();

        } catch (RazorpayException e) {
            log.error("Razorpay order creation failed for booking {}: {}", bookingReference, e.getMessage());
            throw new RuntimeException("Payment initiation failed. Please try again. Error: " + e.getMessage());
        }
    }

    // ── Step 2: Verify Payment & Activate QR Pass ──────────────────────────────

    @Transactional
    public BookingService.BookingConfirmResult verifyAndConfirmPayment(PaymentVerifyRequest req) {
        return verifyAndConfirmPayment(req, null);
    }

    @Transactional
    public BookingService.BookingConfirmResult verifyAndConfirmPayment(PaymentVerifyRequest req, String requestingUserEmail) {
        Booking booking = bookingRepository.findByBookingReference(req.getBookingReference())
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + req.getBookingReference()));

        // IDOR Defense: verify requesting user owns this booking pass
        if (requestingUserEmail != null && booking.getUser() != null && !booking.getUser().getEmail().equalsIgnoreCase(requestingUserEmail)) {
            log.warn("IDOR attempt blocked: User {} attempted to confirm payment on booking {} owned by {}",
                    requestingUserEmail, req.getBookingReference(), booking.getUser().getEmail());
            throw new org.springframework.security.access.AccessDeniedException("You are not authorized to confirm someone else's booking pass.");
        }

        // Prevent double-processing
        if ("PAID".equals(booking.getPaymentStatus())) {
            return new BookingService.BookingConfirmResult(booking, false); // Already confirmed, idempotent
        }

        // Prevent order substitution attack: Ensure client order ID matches booking order ID
        if (booking.getRazorpayOrderId() == null || !booking.getRazorpayOrderId().equals(req.getRazorpayOrderId())) {
            log.warn("Mismatched Razorpay order ID for booking {}. Expected: {}, Provided: {}",
                    booking.getBookingReference(), booking.getRazorpayOrderId(), req.getRazorpayOrderId());
            throw new IllegalArgumentException("Invalid payment request: order ID does not match booking reference.");
        }

        boolean isDemoMode = razorpayKeyId == null || razorpayKeyId.contains("DEMO") || razorpayKeyId.contains("rzp_test_DEMO");
        boolean isDemoOrder = req.getRazorpayOrderId() != null && req.getRazorpayOrderId().startsWith("order_demo_");
        boolean isSimulatedDemo = isDemoMode && isDemoOrder;

        // ── Critical: Cryptographic signature verification ──────────────────
        // Razorpay signs: HMAC-SHA256(orderId + "|" + paymentId, keySecret)
        // If this passes, payment is provably genuine — Razorpay's guarantee.
        if (!isSimulatedDemo) {
            try {
                JSONObject attributes = new JSONObject();
                attributes.put("razorpay_order_id", req.getRazorpayOrderId());
                attributes.put("razorpay_payment_id", req.getRazorpayPaymentId());
                attributes.put("razorpay_signature", req.getRazorpaySignature());

                Utils.verifyPaymentSignature(attributes, razorpayKeySecret);
            } catch (RazorpayException e) {
                log.warn("Razorpay signature verification FAILED for booking {}: {}", req.getBookingReference(), e.getMessage());
                booking.setPaymentStatus("FAILED");
                bookingRepository.save(booking);
                throw new IllegalArgumentException("Payment verification failed. Possible fraud attempt. Transaction voided.");
            }
        } else {
            log.info("Demo Mode: Bypassing Razorpay server signature verification for simulated booking {}", req.getBookingReference());
        }

        // ── Payment verified — activate the booking ─────────────────────────
        booking.setPaymentStatus("PAID");
        booking.setRazorpayPaymentId(req.getRazorpayPaymentId());

        // Generate HMAC-signed QR pass token now (only after verified payment!)
        String passToken = qrCodeService.generateSignedPassToken(
                booking.getBookingReference(),
                booking.getCircuit().getId(),
                booking.getUser().getId()
        );
        booking.setQrPassToken(passToken);

        // Pre-create atomic one-time redemption slots for each attraction
        for (CircuitPlace cp : booking.getCircuit().getCircuitPlaces()) {
            // Avoid duplicate slots if somehow called twice
            if (redemptionRepository.findByBookingIdAndPlaceId(booking.getId(), cp.getPlace().getId()).isEmpty()) {
                TicketRedemption redemption = TicketRedemption.builder()
                        .booking(booking)
                        .place(cp.getPlace())
                        .status("PENDING")
                        .build();
                redemptionRepository.save(redemption);
                booking.getRedemptions().add(redemption);
            }
        }

        Booking savedBooking = bookingRepository.save(booking);
        circuitPassService.createCircuitPassForBooking(savedBooking);
        log.info("Booking {} confirmed after successful payment. QR pass generated.", booking.getBookingReference());

        // Send confirmation email asynchronously
        mailService.sendBookingConfirmation(savedBooking);

        return new BookingService.BookingConfirmResult(savedBooking, true);
    }
}

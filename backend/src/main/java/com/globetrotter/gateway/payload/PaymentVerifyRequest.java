package com.globetrotter.gateway.payload;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Request body sent from frontend after Razorpay payment succeeds.
 * Contains the 3-part signature that backend verifies to confirm payment integrity.
 */
@Data
public class PaymentVerifyRequest {
    @NotBlank private String bookingReference;
    @NotBlank private String razorpayOrderId;
    @NotBlank private String razorpayPaymentId;
    @NotBlank private String razorpaySignature; // HMAC-SHA256(orderId + "|" + paymentId, keySecret)
}

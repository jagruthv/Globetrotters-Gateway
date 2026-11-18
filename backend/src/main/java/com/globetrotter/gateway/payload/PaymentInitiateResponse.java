package com.globetrotter.gateway.payload;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Response returned to frontend when a booking is initiated.
 * Frontend uses razorpayOrderId + amount + keyId to open Razorpay checkout widget.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentInitiateResponse {
    private String bookingReference;
    private String razorpayOrderId;   // Pass to Razorpay JS widget
    private BigDecimal amount;         // In INR (Razorpay widget shows this)
    private String currency;           // "INR"
    private String razorpayKeyId;      // Public key — safe to send to frontend
    private String circuitTitle;
    private String customerEmail;
    private String customerName;
}

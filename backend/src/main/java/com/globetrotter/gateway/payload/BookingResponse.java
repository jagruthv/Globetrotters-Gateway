package com.globetrotter.gateway.payload;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingResponse {
    private Long id;
    private String bookingReference;
    private Long circuitId;
    private String circuitTitle;
    private String circuitBannerImage;
    private BigDecimal totalAmount;
    private Integer numberOfTourists;
    private LocalDate visitStartDate;
    private LocalDate visitEndDate;
    private String paymentStatus;
    private boolean paymentPending;       // true when status = PENDING — triggers checkout redirect
    private String razorpayOrderId;       // returned only during initiate phase, null otherwise
    private String qrImageUrl;            // server-side QR image reference (no token in response!)
    private LocalDateTime createdAt;
    private List<RedemptionStatusDTO> redemptions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RedemptionStatusDTO {
        private Long placeId;
        private String placeName;
        private String category;
        private String address;
        private String openingTime;
        private String closingTime;
        private String status; // "PENDING", "CHECKED_IN", "EXPIRED"
        private LocalDateTime checkedInAt;
    }
}


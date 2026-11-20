package com.globetrotter.gateway.emailotp.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

public class EmailOtpDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SendRequest {
        @NotBlank(message = "Email address is required")
        @Email(message = "Please provide a valid email address")
        private String email;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SendResponse {
        private boolean sent;
        private int expiresInSeconds;
        private String message;
        private Long retryAfterSeconds;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class VerifyRequest {
        @NotBlank(message = "Email address is required")
        @Email(message = "Please provide a valid email address")
        private String email;

        @NotBlank(message = "OTP code is required")
        @Pattern(regexp = "^\\d{6}$", message = "OTP must be a 6-digit number")
        private String otp;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class VerifyResponse {
        private boolean verified;
        private String email;
        private String message;
        private Integer remainingAttempts;
        private String token; // Optional session token hook for seamless login
    }
}

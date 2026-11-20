package com.globetrotter.gateway.emailotp.controller;

import com.globetrotter.gateway.emailotp.dto.EmailOtpDto;
import com.globetrotter.gateway.emailotp.service.EmailOtpService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth/email-otp")
@RequiredArgsConstructor
@Tag(name = "Amazon SES Email OTP", description = "Isolated transactional email OTP verification endpoints")
public class EmailOtpController {

    private final EmailOtpService emailOtpService;

    @PostMapping("/send")
    @Operation(summary = "Send Email OTP", description = "Generates a 6-digit numeric OTP and sends it via Amazon SES (or Console fallback)")
    public ResponseEntity<EmailOtpDto.SendResponse> sendOtp(@Valid @RequestBody EmailOtpDto.SendRequest request) {
        EmailOtpDto.SendResponse response = emailOtpService.sendEmailOtp(request.getEmail());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify")
    @Operation(summary = "Verify Email OTP", description = "Verifies a submitted 6-digit OTP using constant-time HMAC-SHA256 comparison")
    public ResponseEntity<EmailOtpDto.VerifyResponse> verifyOtp(@Valid @RequestBody EmailOtpDto.VerifyRequest request) {
        EmailOtpDto.VerifyResponse response = emailOtpService.verifyEmailOtp(request.getEmail(), request.getOtp());
        return ResponseEntity.ok(response);
    }
}

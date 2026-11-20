package com.globetrotter.gateway.emailotp.service;

import com.globetrotter.gateway.emailotp.dto.EmailOtpDto;
import com.globetrotter.gateway.emailotp.model.EmailOtpToken;
import com.globetrotter.gateway.emailotp.repository.EmailOtpTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailOtpService {

    private final EmailOtpTokenRepository tokenRepository;
    private final OtpEmailSender otpEmailSender;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.auth.otp.hmac-secret:${OTP_HMAC_SECRET:${app.qr.hmac-secret:6A586E3272357538782F413F4428472B4B6250645367566B5970404E63526655}}}")
    private String hmacSecret;

    private static final int OTP_EXPIRY_MINUTES = 5;
    private static final int COOLDOWN_SECONDS = 60;
    private static final int MAX_HOURLY_SENDS = 5;
    private static final int MAX_ATTEMPTS = 5;

    /**
     * Generates, stores, and dispatches a 6-digit numeric OTP.
     */
    @Transactional
    public EmailOtpDto.SendResponse sendEmailOtp(String rawEmail) {
        String cleanEmail = normalizeEmail(rawEmail);
        LocalDateTime now = LocalDateTime.now();

        // 1. Rate limiting: 60-second cooldown from last sent OTP
        Optional<EmailOtpToken> latestToken = tokenRepository.findTopByEmailOrderByCreatedAtDesc(cleanEmail);
        if (latestToken.isPresent()) {
            long secondsSince = Duration.between(latestToken.get().getCreatedAt(), now).getSeconds();
            if (secondsSince < COOLDOWN_SECONDS) {
                long retryAfter = COOLDOWN_SECONDS - secondsSince;
                throw new ResponseStatusException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "Please wait " + retryAfter + " seconds before requesting a new code."
                );
            }
        }

        // 2. Rate limiting: Maximum 5 sends per email per hour
        long hourlyCount = tokenRepository.countByEmailAndCreatedAtAfter(cleanEmail, now.minusHours(1));
        if (hourlyCount >= MAX_HOURLY_SENDS) {
            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "Too many OTP requests for this email. Please try again in 1 hour."
            );
        }

        // 3. Invalidate any existing unused tokens for this email
        List<EmailOtpToken> unusedTokens = tokenRepository.findByEmailAndUsedFalse(cleanEmail);
        for (EmailOtpToken t : unusedTokens) {
            t.setUsed(true);
        }
        if (!unusedTokens.isEmpty()) {
            tokenRepository.saveAll(unusedTokens);
        }

        // 4. Generate 6-digit zero-padded numeric OTP
        int rawCode = secureRandom.nextInt(1_000_000);
        String otpCode = String.format("%06d", rawCode);

        // 5. Compute HMAC-SHA256 hash (never store plaintext OTP)
        String hash = computeHmacHash(cleanEmail, otpCode);

        // 6. Persist record in database
        EmailOtpToken newToken = EmailOtpToken.builder()
                .email(cleanEmail)
                .otpHash(hash)
                .createdAt(now)
                .expiresAt(now.plusMinutes(OTP_EXPIRY_MINUTES))
                .attempts(0)
                .maxAttempts(MAX_ATTEMPTS)
                .used(false)
                .build();
        tokenRepository.save(newToken);

        // 7. Dispatch via configured email sender (SES / Console)
        otpEmailSender.sendOtp(cleanEmail, otpCode, OTP_EXPIRY_MINUTES);

        log.info("📧 Verification code sent to {} (expires in {}m)", cleanEmail, OTP_EXPIRY_MINUTES);

        return EmailOtpDto.SendResponse.builder()
                .sent(true)
                .expiresInSeconds(OTP_EXPIRY_MINUTES * 60)
                .message("Verification code sent to " + cleanEmail)
                .build();
    }

    /**
     * Verifies the submitted OTP in constant-time and locks on excessive failures.
     */
    @Transactional
    public EmailOtpDto.VerifyResponse verifyEmailOtp(String rawEmail, String otpCode) {
        String cleanEmail = normalizeEmail(rawEmail);
        String cleanOtp = otpCode != null ? otpCode.trim() : "";
        LocalDateTime now = LocalDateTime.now();

        // 1. Fetch latest unused and non-expired token
        Optional<EmailOtpToken> tokenOpt = tokenRepository
                .findTopByEmailAndUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(cleanEmail, now);

        if (tokenOpt.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Verification code has expired or was not requested. Please request a new code."
            );
        }

        EmailOtpToken token = tokenOpt.get();

        // 2. Reject if locked due to maximum attempts
        if (token.getAttempts() >= token.getMaxAttempts()) {
            token.setUsed(true);
            tokenRepository.save(token);
            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "Too many incorrect attempts. This code is locked. Please request a new code."
            );
        }

        // 3. Compute expected HMAC hash and verify in constant time
        String expectedHash = token.getOtpHash();
        String actualHash = computeHmacHash(cleanEmail, cleanOtp);

        boolean matches = MessageDigest.isEqual(
                expectedHash.getBytes(StandardCharsets.UTF_8),
                actualHash.getBytes(StandardCharsets.UTF_8)
        );

        if (!matches) {
            token.setAttempts(token.getAttempts() + 1);
            tokenRepository.save(token);
            int remaining = Math.max(0, token.getMaxAttempts() - token.getAttempts());
            log.warn("⚠️ Invalid OTP attempt for {} (remaining attempts: {})", cleanEmail, remaining);

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid verification code. " + remaining + " attempts remaining."
            );
        }

        // 4. Mark used atomically upon success
        token.setUsed(true);
        tokenRepository.save(token);

        log.info("✅ Email OTP successfully verified for {}", cleanEmail);

        return EmailOtpDto.VerifyResponse.builder()
                .verified(true)
                .email(cleanEmail)
                .message("Email verified successfully.")
                .remainingAttempts(token.getMaxAttempts() - token.getAttempts())
                .build();
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email address is required.");
        }
        return email.trim().toLowerCase();
    }

    private String computeHmacHash(String email, String otp) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec keySpec = new SecretKeySpec(hmacSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(keySpec);
            String payload = email + ":" + otp;
            byte[] rawHmac = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(rawHmac);
        } catch (Exception e) {
            log.error("Failed to compute HMAC-SHA256 for email OTP: {}", e.getMessage());
            throw new IllegalStateException("Security computation failure");
        }
    }
}

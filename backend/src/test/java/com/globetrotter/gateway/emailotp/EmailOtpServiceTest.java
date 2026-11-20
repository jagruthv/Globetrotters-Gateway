package com.globetrotter.gateway.emailotp;

import com.globetrotter.gateway.emailotp.dto.EmailOtpDto;
import com.globetrotter.gateway.emailotp.model.EmailOtpToken;
import com.globetrotter.gateway.emailotp.repository.EmailOtpTokenRepository;
import com.globetrotter.gateway.emailotp.service.EmailOtpService;
import com.globetrotter.gateway.emailotp.service.OtpEmailSender;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailOtpServiceTest {

    @Mock
    private EmailOtpTokenRepository tokenRepository;

    @Mock
    private OtpEmailSender otpEmailSender;

    @InjectMocks
    private EmailOtpService emailOtpService;

    private final String testEmail = "tourist.test@example.com";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(emailOtpService, "hmacSecret", "test-secret-key-for-hmac-sha256-unit-tests");
    }

    @Test
    @DisplayName("Should successfully send OTP and persist hashed token")
    void shouldSendOtpSuccessfully() {
        when(tokenRepository.findTopByEmailOrderByCreatedAtDesc(testEmail)).thenReturn(Optional.empty());
        when(tokenRepository.countByEmailAndCreatedAtAfter(eq(testEmail), any())).thenReturn(0L);
        when(tokenRepository.findByEmailAndUsedFalse(testEmail)).thenReturn(Collections.emptyList());

        ArgumentCaptor<String> codeCaptor = ArgumentCaptor.forClass(String.class);

        EmailOtpDto.SendResponse response = emailOtpService.sendEmailOtp(testEmail);

        assertThat(response.isSent()).isTrue();
        assertThat(response.getExpiresInSeconds()).isEqualTo(300);

        verify(otpEmailSender, times(1)).sendOtp(eq(testEmail), codeCaptor.capture(), eq(5));
        String dispatchedCode = codeCaptor.getValue();
        assertThat(dispatchedCode).matches("^\\d{6}$");

        ArgumentCaptor<EmailOtpToken> tokenCaptor = ArgumentCaptor.forClass(EmailOtpToken.class);
        verify(tokenRepository).save(tokenCaptor.capture());

        EmailOtpToken saved = tokenCaptor.getValue();
        assertThat(saved.isUsed()).isFalse();
        assertThat(saved.getAttempts()).isEqualTo(0);
        assertThat(saved.getOtpHash()).isNotBlank();
        assertThat(saved.getOtpHash()).isNotEqualTo(dispatchedCode);
    }

    @Test
    @DisplayName("Should reject resend within 60 seconds with 429 Too Many Requests")
    void shouldBlockRapidResend() {
        EmailOtpToken recentToken = EmailOtpToken.builder()
                .email(testEmail)
                .createdAt(LocalDateTime.now().minusSeconds(30))
                .build();

        when(tokenRepository.findTopByEmailOrderByCreatedAtDesc(testEmail)).thenReturn(Optional.of(recentToken));

        assertThatThrownBy(() -> emailOtpService.sendEmailOtp(testEmail))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("429 TOO_MANY_REQUESTS");

        verify(otpEmailSender, never()).sendOtp(any(), any(), anyInt());
    }

    @Test
    @DisplayName("Should reject resend when hourly limit of 5 is exceeded")
    void shouldBlockHourlyLimitExceeded() {
        when(tokenRepository.findTopByEmailOrderByCreatedAtDesc(testEmail)).thenReturn(Optional.empty());
        when(tokenRepository.countByEmailAndCreatedAtAfter(eq(testEmail), any())).thenReturn(5L);

        assertThatThrownBy(() -> emailOtpService.sendEmailOtp(testEmail))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Too many OTP requests");

        verify(otpEmailSender, never()).sendOtp(any(), any(), anyInt());
    }

    @Test
    @DisplayName("Should reject wrong OTP and increment attempts")
    void shouldRejectIncorrectOtp() {
        EmailOtpToken token = EmailOtpToken.builder()
                .id(1L)
                .email(testEmail)
                .otpHash("dummy-hash-that-wont-match")
                .expiresAt(LocalDateTime.now().plusMinutes(5))
                .attempts(0)
                .maxAttempts(5)
                .used(false)
                .build();

        when(tokenRepository.findTopByEmailAndUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(eq(testEmail), any()))
                .thenReturn(Optional.of(token));

        assertThatThrownBy(() -> emailOtpService.verifyEmailOtp(testEmail, "999999"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Invalid verification code");

        assertThat(token.getAttempts()).isEqualTo(1);
        verify(tokenRepository).save(token);
    }
}

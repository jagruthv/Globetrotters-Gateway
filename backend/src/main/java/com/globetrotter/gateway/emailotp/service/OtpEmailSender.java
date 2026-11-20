package com.globetrotter.gateway.emailotp.service;

public interface OtpEmailSender {
    /**
     * Dispatches a single transactional OTP email.
     *
     * @param toEmail       recipient email
     * @param otpCode       plain 6-digit numeric OTP code
     * @param expiryMinutes minutes before code expires
     */
    void sendOtp(String toEmail, String otpCode, int expiryMinutes);
}

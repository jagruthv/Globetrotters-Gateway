package com.globetrotter.gateway.emailotp.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sesv2.SesV2Client;
import software.amazon.awssdk.services.sesv2.model.*;

@Service
@Slf4j
public class AwsSesOtpEmailSender implements OtpEmailSender {

    @Value("${app.otp.provider:${OTP_PROVIDER:ses}}")
    private String otpProvider;

    @Value("${app.aws.ses.access-key:${AWS_SES_ACCESS_KEY:}}")
    private String awsAccessKey;

    @Value("${app.aws.ses.secret-key:${AWS_SES_SECRET_KEY:}}")
    private String awsSecretKey;

    @Value("${app.aws.ses.region:${AWS_SES_REGION:ap-south-1}}")
    private String awsRegion;

    @Value("${app.aws.ses.from-email:${AWS_SES_FROM_EMAIL:vanteddujagruth2406@gmail.com}}")
    private String fromEmail;

    @Override
    public void sendOtp(String toEmail, String otpCode, int expiryMinutes) {
        if ("console".equalsIgnoreCase(otpProvider) || awsAccessKey.isBlank() || awsSecretKey.isBlank()) {
            log.info("════════════════════════════════════════════════════════════════════");
            log.info("📧 [LOCAL EMAIL OTP CONSOLE FALLBACK]");
            log.info("   Recipient : {}", toEmail);
            log.info("   Code      : {}", otpCode);
            log.info("   Expires   : {} Minutes", expiryMinutes);
            log.info("════════════════════════════════════════════════════════════════════");
            return;
        }

        try (SesV2Client sesClient = SesV2Client.builder()
                .region(Region.of(awsRegion.trim()))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(awsAccessKey.trim(), awsSecretKey.trim())
                ))
                .build()) {

            String htmlBody = """
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <title>Verification Code</title>
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; color: #0f172a;">
                  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 32px;">
                    <div style="font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">Globetrotter Gateway</div>
                    <div style="font-size: 13px; color: #64748b; margin-bottom: 24px;">One-Time Verification Code</div>
                    <p style="font-size: 14px; line-height: 1.5; color: #334155; margin-bottom: 16px;">
                      Use the following code to sign in to your account. This code is valid for <strong>%d minutes</strong>.
                    </p>
                    <div style="background-color: #f1f5f9; border-radius: 6px; padding: 16px; text-align: center; margin-bottom: 24px;">
                      <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0f172a; font-family: monospace;">%s</span>
                    </div>
                    <p style="font-size: 12px; line-height: 1.4; color: #64748b; margin-bottom: 0;">
                      If you did not request this verification code, please ignore this email. Never share this code with anyone.
                    </p>
                  </div>
                </body>
                </html>
                """.formatted(expiryMinutes, otpCode);

            String textBody = """
                Globetrotter Gateway Verification Code
                
                Your one-time verification code is: %s
                
                This code will expire in %d minutes.
                If you did not request this code, please ignore this message.
                """.formatted(otpCode, expiryMinutes);

            SendEmailRequest request = SendEmailRequest.builder()
                    .fromEmailAddress(fromEmail.trim())
                    .destination(Destination.builder()
                            .toAddresses(toEmail.trim())
                            .build())
                    .content(EmailContent.builder()
                            .simple(Message.builder()
                                    .subject(Content.builder()
                                            .data("Your Globetrotter Verification Code")
                                            .charset("UTF-8")
                                            .build())
                                    .body(Body.builder()
                                            .html(Content.builder()
                                                    .data(htmlBody)
                                                    .charset("UTF-8")
                                                    .build())
                                            .text(Content.builder()
                                                    .data(textBody)
                                                    .charset("UTF-8")
                                                    .build())
                                            .build())
                                    .build())
                            .build())
                    .build();

            SendEmailResponse response = sesClient.sendEmail(request);
            log.info("✅ Amazon SES email dispatched successfully to {}. MessageId: {}", toEmail, response.messageId());

        } catch (SesV2Exception e) {
            log.error("❌ Amazon SES v2 failed to dispatch email to {}: [{}] {}", toEmail, e.awsErrorDetails().errorCode(), e.awsErrorDetails().errorMessage());
            throw new IllegalStateException("Email delivery failed via Amazon SES: " + e.awsErrorDetails().errorMessage());
        } catch (Exception e) {
            log.error("❌ Unexpected error during Amazon SES dispatch to {}: {}", toEmail, e.getMessage(), e);
            throw new IllegalStateException("Failed to transmit email verification code. Please check email address.");
        }
    }
}

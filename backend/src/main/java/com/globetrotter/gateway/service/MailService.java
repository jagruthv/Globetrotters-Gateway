package com.globetrotter.gateway.service;

import com.globetrotter.gateway.model.Booking;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

/**
 * MailService — sends HTML booking confirmation emails with inline QR code PNG.
 *
 * Uses @Async so the email send never blocks the HTTP response thread.
 * If SMTP is not configured, errors are caught and logged (non-fatal).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MailService {

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final QrCodeService qrCodeService;

    @Value("${app.mail.from:noreply@globetrotter.com}")
    private String fromAddress;

    @Value("${app.mail.from-name:Globetrotter Gateway}")
    private String fromName;

    /**
     * Sends a beautiful HTML confirmation email with the QR code embedded inline.
     * Called @Async — does not block the booking confirmation response.
     */
    @Async
    public void sendBookingConfirmation(Booking booking) {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.info("SMTP JavaMailSender not configured. Skipping confirmation email for booking {}.", booking.getBookingReference());
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress, fromName);
            helper.setTo(booking.getUser().getEmail());
            helper.setSubject("✅ Your Globetrotter Pass is Confirmed — " + booking.getBookingReference());

            // Generate QR image bytes for inline attachment
            byte[] qrImageBytes = qrCodeService.generateQrCodeImage(booking.getQrPassToken(), 300, 300);

            String html = buildConfirmationHtml(booking);
            helper.setText(html, true);

            // Embed QR image as inline attachment (Content-ID referenced in HTML)
            helper.addInline("qr-pass-image",
                    new jakarta.mail.util.ByteArrayDataSource(qrImageBytes, "image/png"));

            mailSender.send(message);
            log.info("Booking confirmation email sent to: {}", booking.getUser().getEmail());

        } catch (Exception e) {
            // Email failure should never block the booking — log and continue
            log.warn("Failed to send confirmation email for booking {}: {}", booking.getBookingReference(), e.getMessage());
        }
    }

    /**
     * Sends a 6-digit authentication verification code to the user's email.
     */
    @Async
    public void sendOtpEmail(String toEmail, String code) {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.info("[EMAIL SIMULATION] SMTP not configured. OTP for {}: {}", toEmail, code);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");

            helper.setFrom(fromAddress, fromName);
            helper.setTo(toEmail);
            helper.setSubject("🔑 Your Globetrotter Verification Code: " + code);

            String html = """
                <div style="font-family:'Segoe UI',sans-serif;max-width:480px;margin:20px auto;background:#0f172a;color:#f8fafc;padding:32px;border-radius:12px;border:1px solid #334155;">
                  <h2 style="color:#2dd4bf;margin-top:0;">Globetrotter Gateway</h2>
                  <p style="color:#94a3b8;font-size:14px;">Here is your verification code. It is valid for 10 minutes:</p>
                  <div style="background:#1e293b;border:1px solid #2dd4bf;border-radius:8px;padding:16px;text-align:center;margin:24px 0;">
                    <span style="font-size:32px;font-weight:900;letter-spacing:6px;color:#38bdf8;font-family:monospace;">%s</span>
                  </div>
                  <p style="color:#64748b;font-size:12px;">If you did not request this code, you can safely ignore this email.</p>
                </div>
                """.formatted(code);

            helper.setText(html, true);
            mailSender.send(message);
            log.info("Verification code email dispatched to: {}", toEmail);
        } catch (Exception e) {
            log.warn("Failed to send OTP email to {}: {}", toEmail, e.getMessage());
        }
    }

    private String buildConfirmationHtml(Booking booking) {
        return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Booking Confirmed</title>
            </head>
            <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',sans-serif;">
              <div style="max-width:560px;margin:40px auto;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">

                <!-- Header -->
                <div style="background:linear-gradient(135deg,#0d9488,#06b6d4);padding:32px 24px;text-align:center;">
                  <h1 style="margin:0;color:#0f172a;font-size:24px;font-weight:900;">🌍 Globetrotter Gateway</h1>
                  <p style="margin:8px 0 0;color:#0f172a;opacity:0.8;font-size:14px;">Your Circuit Pass is Confirmed!</p>
                </div>

                <!-- Body -->
                <div style="padding:32px 24px;">
                  <p style="color:#94a3b8;font-size:14px;margin-top:0;">Hello <strong style="color:#f8fafc;">""" + booking.getUser().getFullName() + """
                  </strong>,</p>
                  <p style="color:#94a3b8;font-size:14px;">Your booking for the <strong style="color:#2dd4bf;">""" + booking.getCircuit().getTitle() + """
                  </strong> circuit has been confirmed. Show this QR code at every attraction gate.</p>

                  <!-- Booking Details -->
                  <div style="background:#0f172a;border-radius:12px;padding:20px;margin:20px 0;border:1px solid #334155;">
                    <table style="width:100%;border-collapse:collapse;font-size:13px;">
                      <tr>
                        <td style="color:#64748b;padding:6px 0;">Booking Reference</td>
                        <td style="color:#f8fafc;font-weight:700;text-align:right;font-family:monospace;">""" + booking.getBookingReference() + """
                        </td>
                      </tr>
                      <tr>
                        <td style="color:#64748b;padding:6px 0;">Circuit</td>
                        <td style="color:#f8fafc;text-align:right;">""" + booking.getCircuit().getTitle() + """
                        </td>
                      </tr>
                      <tr>
                        <td style="color:#64748b;padding:6px 0;">Visitors</td>
                        <td style="color:#f8fafc;text-align:right;">""" + booking.getNumberOfTourists() + " person(s)" + """
                        </td>
                      </tr>
                      <tr>
                        <td style="color:#64748b;padding:6px 0;">Valid From</td>
                        <td style="color:#2dd4bf;font-weight:700;text-align:right;">""" + booking.getVisitStartDate() + " → " + booking.getVisitEndDate() + """
                        </td>
                      </tr>
                      <tr>
                        <td style="color:#64748b;padding:6px 0;">Amount Paid</td>
                        <td style="color:#34d399;font-weight:700;text-align:right;">₹""" + booking.getTotalAmount() + """
                        </td>
                      </tr>
                    </table>
                  </div>

                  <!-- QR Code -->
                  <div style="text-align:center;margin:24px 0;">
                    <p style="color:#64748b;font-size:12px;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.05em;">Your Digital Entry Pass</p>
                    <img src="cid:qr-pass-image" alt="QR Pass" style="width:200px;height:200px;border:4px solid #0d9488;border-radius:12px;background:#fff;padding:8px;" />
                    <p style="color:#64748b;font-size:11px;margin-top:8px;">Show this at each attraction gate for instant entry</p>
                  </div>

                  <p style="color:#475569;font-size:12px;text-align:center;border-top:1px solid #334155;padding-top:20px;margin-bottom:0;">
                    Globetrotter Gateway · Visakhapatnam Tourism · <a href="#" style="color:#2dd4bf;">View My Passes</a>
                  </p>
                </div>
              </div>
            </body>
            </html>
            """;
    }
}

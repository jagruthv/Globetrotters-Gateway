package com.globetrotter.gateway.service;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpService {

    private final MailService mailService;
    private final SecureRandom secureRandom = new SecureRandom();

    // 0. MSG91 Secure OTP Gateway (Widget ID: 366b7364466f323431363330)
    @Value("${app.auth.msg91.auth-key:${MSG91_AUTH_KEY:}}")
    private String msg91AuthKey;

    @Value("${app.auth.msg91.widget-id:${MSG91_WIDGET_ID:366b7364466f323431363330}}")
    private String msg91WidgetId;

    @Value("${app.auth.msg91.template-id:${MSG91_OTP_TEMPLATE_ID:}}")
    private String msg91TemplateId;

    // 1. Generic SMS Gateway Config
    @Value("${app.auth.sms.auth-key:${SMS_GATEWAY_AUTH_KEY:}}")
    private String smsAuthKey;

    @Value("${app.auth.sms.gateway-url:${SMS_GATEWAY_URL:}}")
    private String smsGatewayUrl;

    // 2. Fast2SMS Quick OTP Gateway (India)
    @Value("${app.auth.fast2sms.api-key:${FAST2SMS_API_KEY:}}")
    private String fast2smsApiKey;

    // 3. Meta WhatsApp Cloud API (1,000 Free Monthly Conversations with Free Virtual Number)
    @Value("${app.auth.whatsapp.access-token:${WHATSAPP_ACCESS_TOKEN:}}")
    private String whatsappAccessToken;

    @Value("${app.auth.whatsapp.phone-number-id:${WHATSAPP_PHONE_NUMBER_ID:}}")
    private String whatsappPhoneNumberId;

    // 4. Twilio SMS Gateway (Free Trial Global)
    @Value("${app.auth.twilio.account-sid:${TWILIO_ACCOUNT_SID:}}")
    private String twilioAccountSid;

    @Value("${app.auth.twilio.auth-token:${TWILIO_AUTH_TOKEN:}}")
    private String twilioAuthToken;

    @Value("${app.auth.twilio.from-number:${TWILIO_FROM_NUMBER:}}")
    private String twilioFromNumber;

    // 5. Free Telegram Bot Dispatch (Instant Zero-Cost Mobile Alerts)
    @Value("${app.auth.telegram.bot-token:${TELEGRAM_BOT_TOKEN:}}")
    private String telegramBotToken;

    @Value("${app.auth.telegram.chat-id:${TELEGRAM_CHAT_ID:}}")
    private String telegramChatId;

    // 6. Generic Webhook (e.g. n8n / Zapier / Make / WhatsApp Webhook)
    @Value("${app.auth.webhook.otp-url:${OTP_WEBHOOK_URL:}}")
    private String otpWebhookUrl;

    @Data
    @AllArgsConstructor
    private static class OtpRecord {
        private String code;
        private LocalDateTime expiresAt;
        private LocalDateTime lastSentAt;
        private int attempts;
    }

    private final Map<String, OtpRecord> phoneOtpStore = new ConcurrentHashMap<>();
    private final Map<String, OtpRecord> emailOtpStore = new ConcurrentHashMap<>();

    /**
     * Dispatches a 6-digit verification code to the target phone number.
     * Enforces a 60-second cooldown between resends.
     */
    public Map<String, Object> sendPhoneOtp(String rawPhone) {
        String cleanPhone = sanitizePhone(rawPhone);
        if (cleanPhone.length() != 10) {
            throw new IllegalArgumentException("Please enter a valid 10-digit Indian mobile number.");
        }

        OtpRecord existing = phoneOtpStore.get(cleanPhone);
        if (existing != null && existing.getLastSentAt().plusSeconds(60).isAfter(LocalDateTime.now())) {
            throw new IllegalStateException("Please wait 60 seconds before requesting a new OTP.");
        }

        String code = String.format("%06d", secureRandom.nextInt(1000000));
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = now.plusMinutes(5);

        phoneOtpStore.put(cleanPhone, new OtpRecord(code, expiresAt, now, 0));

        // Transmit via configured external gateways
        String gatewayProvider = dispatchToExternalGateways(cleanPhone, code);

        log.info("[OTP DISPATCH] Destination: +91 {} | Code: {} | Active Gateway: {}", cleanPhone, code, gatewayProvider);

        String whatsappDeepLink = "https://api.whatsapp.com/send?phone=91" + cleanPhone +
                "&text=" + URLEncoder.encode("Globetrotter Gateway Verification Code: " + code, StandardCharsets.UTF_8);

        return Map.of(
                "success", true,
                "phone", "+91 " + cleanPhone,
                "expiresInSeconds", 300,
                "provider", gatewayProvider,
                "whatsappDeepLink", whatsappDeepLink,
                "message", "Verification code dispatched via " + gatewayProvider,
                "devCode", code // Surface code for effortless testing
        );
    }

    /**
     * Verifies the 6-digit code against the stored OTP for this phone.
     */
    public boolean verifyPhoneOtp(String rawPhone, String enteredCode) {
        String cleanPhone = sanitizePhone(rawPhone);
        OtpRecord record = phoneOtpStore.get(cleanPhone);

        if (record == null) {
            return false;
        }

        if (LocalDateTime.now().isAfter(record.getExpiresAt())) {
            phoneOtpStore.remove(cleanPhone);
            throw new IllegalStateException("Verification code has expired. Please request a new one.");
        }

        if (record.getAttempts() >= 5) {
            phoneOtpStore.remove(cleanPhone);
            throw new IllegalStateException("Too many incorrect attempts. Please request a new code.");
        }

        if (!record.getCode().equals(enteredCode.trim())) {
            record.setAttempts(record.getAttempts() + 1);
            return false;
        }

        phoneOtpStore.remove(cleanPhone);
        return true;
    }

    /**
     * Dispatches a 6-digit code to the user's email address.
     */
    public Map<String, Object> sendEmailOtp(String email) {
        String cleanEmail = email.toLowerCase().trim();
        if (!cleanEmail.matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
            throw new IllegalArgumentException("Please enter a valid email address.");
        }

        OtpRecord existing = emailOtpStore.get(cleanEmail);
        if (existing != null && existing.getLastSentAt().plusSeconds(60).isAfter(LocalDateTime.now())) {
            throw new IllegalStateException("Please wait 60 seconds before requesting a new email verification code.");
        }

        String code = String.format("%06d", secureRandom.nextInt(1000000));
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = now.plusMinutes(10);

        emailOtpStore.put(cleanEmail, new OtpRecord(code, expiresAt, now, 0));

        mailService.sendOtpEmail(cleanEmail, code);

        log.info("[EMAIL OTP DISPATCH] Destination: {} | Code: {}", cleanEmail, code);

        return Map.of(
                "success", true,
                "email", cleanEmail,
                "expiresInSeconds", 600,
                "message", "Verification code sent to " + cleanEmail,
                "devCode", code
        );
    }

    /**
     * Verifies the 6-digit email OTP.
     */
    public boolean verifyEmailOtp(String email, String enteredCode) {
        String cleanEmail = email.toLowerCase().trim();
        OtpRecord record = emailOtpStore.get(cleanEmail);

        if (record == null) {
            return false;
        }

        if (LocalDateTime.now().isAfter(record.getExpiresAt())) {
            emailOtpStore.remove(cleanEmail);
            throw new IllegalStateException("Verification code has expired. Please request a new one.");
        }

        if (record.getAttempts() >= 5) {
            emailOtpStore.remove(cleanEmail);
            throw new IllegalStateException("Too many incorrect attempts. Please request a new code.");
        }

        if (!record.getCode().equals(enteredCode.trim())) {
            record.setAttempts(record.getAttempts() + 1);
            return false;
        }

        emailOtpStore.remove(cleanEmail);
        return true;
    }

    /**
     * Cascading External Gateway Dispatcher:
     * Attempts real external transmission in priority order:
     * 1. MSG91 Secure OTP (Widget ID: 366b7364466f323431363330)
     * 2. Meta WhatsApp Cloud API (1,000 free monthly conversations with Virtual Number, 0 GST)
     * 3. Fast2SMS Quick OTP
     * 4. Twilio (Global SMS API)
     * 5. Telegram Bot (Free instantaneous mobile push)
     * 6. Webhook (WhatsApp / n8n workflow)
     * 7. Local Safe Fallback (Live Toast & Server Console)
     */
    private String dispatchToExternalGateways(String cleanPhone, String code) {
        RestClient restClient = RestClient.create();

        // 1. MSG91 Secure Carrier OTP (Widget 366b7364466f323431363330)
        if (msg91AuthKey != null && !msg91AuthKey.isBlank()) {
            try {
                String uri = "https://control.msg91.com/api/v5/otp?mobile=91" + cleanPhone + "&authkey=" + msg91AuthKey.trim() + "&otp=" + code;
                if (msg91TemplateId != null && !msg91TemplateId.isBlank()) {
                    uri += "&template_id=" + msg91TemplateId.trim();
                }
                restClient.post()
                        .uri(uri)
                        .retrieve()
                        .toBodilessEntity();
                return "MSG91 (Secure Carrier OTP)";
            } catch (Exception e) {
                log.warn("MSG91 dispatch error: {}", e.getMessage());
            }
        }

        // 2. Meta WhatsApp Cloud API (Zero GST, Virtual Number, 1,000 free/month)
        if (whatsappAccessToken != null && !whatsappAccessToken.isBlank() &&
            whatsappPhoneNumberId != null && !whatsappPhoneNumberId.isBlank()) {
            try {
                Map<String, Object> body = Map.of(
                        "messaging_product", "whatsapp",
                        "to", "91" + cleanPhone,
                        "type", "text",
                        "text", Map.of("body", "🌍 Globetrotter Gateway Verification Code: *" + code + "*\n\nValid for 5 minutes. Do not share this code.")
                );
                restClient.post()
                        .uri("https://graph.facebook.com/v19.0/{phoneId}/messages", whatsappPhoneNumberId.trim())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + whatsappAccessToken.trim())
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .retrieve()
                        .toBodilessEntity();
                return "Meta WhatsApp Cloud API (Virtual Sender)";
            } catch (Exception e) {
                log.warn("WhatsApp Cloud API error: {}", e.getMessage());
            }
        }

        // 2. Fast2SMS Quick OTP
        if (fast2smsApiKey != null && !fast2smsApiKey.isBlank()) {
            try {
                restClient.get()
                        .uri("https://www.fast2sms.com/dev/bulkV2?authorization={key}&variables_values={code}&route=otp&numbers={phone}",
                                fast2smsApiKey.trim(), code, cleanPhone)
                        .retrieve()
                        .toBodilessEntity();
                return "Fast2SMS (Carrier SMS)";
            } catch (Exception e) {
                log.warn("Fast2SMS dispatch error: {}", e.getMessage());
            }
        }

        // 3. Twilio SMS
        if (twilioAccountSid != null && !twilioAccountSid.isBlank() &&
            twilioAuthToken != null && !twilioAuthToken.isBlank() &&
            twilioFromNumber != null && !twilioFromNumber.isBlank()) {
            try {
                String authHeader = "Basic " + Base64.getEncoder().encodeToString(
                        (twilioAccountSid.trim() + ":" + twilioAuthToken.trim()).getBytes());

                MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
                formData.add("To", "+91" + cleanPhone);
                formData.add("From", twilioFromNumber.trim());
                formData.add("Body", "Your Globetrotter Gateway verification code is: " + code + ". Valid for 5 minutes.");

                restClient.post()
                        .uri("https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json", twilioAccountSid.trim())
                        .header(HttpHeaders.AUTHORIZATION, authHeader)
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .body(formData)
                        .retrieve()
                        .toBodilessEntity();
                return "Twilio SMS";
            } catch (Exception e) {
                log.warn("Twilio dispatch error: {}", e.getMessage());
            }
        }

        // 4. Telegram Bot (Free Instant Mobile Alerts)
        if (telegramBotToken != null && !telegramBotToken.isBlank() &&
            telegramChatId != null && !telegramChatId.isBlank()) {
            try {
                String text = "🔑 *Globetrotter Gateway OTP*\n\nTarget Mobile: `+91 " + cleanPhone + "`\nVerification Code: `*" + code + "*`\nExpires in: 5 minutes";
                restClient.get()
                        .uri("https://api.telegram.org/bot{token}/sendMessage?chat_id={chatId}&text={text}&parse_mode=Markdown",
                                telegramBotToken.trim(), telegramChatId.trim(), text)
                        .retrieve()
                        .toBodilessEntity();
                return "Telegram Mobile Bot";
            } catch (Exception e) {
                log.warn("Telegram bot dispatch error: {}", e.getMessage());
            }
        }

        // 5. Custom SMS / WhatsApp Webhook
        if (otpWebhookUrl != null && !otpWebhookUrl.isBlank()) {
            try {
                restClient.post()
                        .uri(otpWebhookUrl.trim())
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of("phone", "+91 " + cleanPhone, "code", code, "appName", "Globetrotter Gateway"))
                        .retrieve()
                        .toBodilessEntity();
                return "External Webhook Gateway";
            } catch (Exception e) {
                log.warn("Webhook dispatch error: {}", e.getMessage());
            }
        }

        // 6. Generic SMS Gateway URL
        if (smsGatewayUrl != null && !smsGatewayUrl.isBlank() && smsAuthKey != null && !smsAuthKey.isBlank()) {
            try {
                restClient.post()
                        .uri(smsGatewayUrl.trim())
                        .header(HttpHeaders.AUTHORIZATION, smsAuthKey.trim())
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of("number", cleanPhone, "otp", code))
                        .retrieve()
                        .toBodilessEntity();
                return "Custom SMS Gateway";
            } catch (Exception e) {
                log.warn("Generic gateway error: {}", e.getMessage());
            }
        }

        return "Developer Console / Live Toast Stream";
    }

    private String sanitizePhone(String phone) {
        if (phone == null) return "";
        String digits = phone.replaceAll("\\D", "");
        return digits.length() >= 10 ? digits.substring(digits.length() - 10) : digits;
    }
}

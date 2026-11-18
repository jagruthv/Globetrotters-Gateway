package com.globetrotter.gateway.controller;

import com.globetrotter.gateway.payload.AuthRequest;
import com.globetrotter.gateway.payload.AuthResponse;
import com.globetrotter.gateway.payload.RegisterRequest;
import com.globetrotter.gateway.security.TokenBlacklistService;
import com.globetrotter.gateway.security.UserDetailsImpl;
import com.globetrotter.gateway.service.AuthService;
import com.globetrotter.gateway.service.OtpService;
import com.globetrotter.gateway.service.RateLimitingService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final OtpService otpService;
    private final RateLimitingService rateLimitingService;
    private final TokenBlacklistService tokenBlacklistService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AuthRequest request, HttpServletRequest httpRequest) {
        String clientIp = getClientIp(httpRequest);
        String accountKey = request.getEmail() != null ? request.getEmail().toLowerCase().trim() : "anonymous";

        if (!rateLimitingService.tryConsumeAuth("login_ip_" + clientIp)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Too many login attempts from this network. Please wait 1 minute before trying again."));
        }
        if (!rateLimitingService.tryConsumeAuth("login_account_" + accountKey)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Too many login attempts on this account. Please wait 1 minute before trying again."));
        }

        return ResponseEntity.ok(authService.authenticate(request));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request, HttpServletRequest httpRequest) {
        String clientIp = getClientIp(httpRequest);
        if (!rateLimitingService.tryConsumeAuth("register_ip_" + clientIp)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Too many registration attempts. Please wait 1 minute."));
        }
        return ResponseEntity.ok(authService.register(request));
    }

    /**
     * Google Sign-In Endpoint.
     * Verifies the Google Identity Services JWT ID token and logs the user in.
     */
    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@RequestBody Map<String, String> payload, HttpServletRequest httpRequest) {
        String clientIp = getClientIp(httpRequest);
        if (!rateLimitingService.tryConsumeAuth("google_auth_ip_" + clientIp)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Too many authentication attempts. Please wait 1 minute."));
        }

        String idToken = payload.get("idToken");
        if (idToken == null || idToken.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Google idToken is required"));
        }

        try {
            AuthResponse response = authService.authenticateGoogle(idToken);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Dispatches an OTP to a mobile phone number.
     */
    @PostMapping("/otp/send-phone")
    public ResponseEntity<?> sendPhoneOtp(@RequestBody Map<String, String> payload, HttpServletRequest httpRequest) {
        String clientIp = getClientIp(httpRequest);
        if (!rateLimitingService.tryConsumeAuth("otp_send_ip_" + clientIp)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Too many OTP requests. Please wait a minute."));
        }

        String phone = payload.get("phoneNumber");
        try {
            Map<String, Object> result = otpService.sendPhoneOtp(phone);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Verifies phone OTP and returns authenticated session token.
     */
    @PostMapping("/otp/verify-phone")
    public ResponseEntity<?> verifyPhoneOtp(@RequestBody Map<String, String> payload) {
        String phone = payload.get("phoneNumber");
        String otp = payload.get("otp");

        try {
            AuthResponse response = authService.authenticateMobileOtp(phone, otp);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Dispatches an OTP to an email address.
     */
    @PostMapping("/otp/send-email")
    public ResponseEntity<?> sendEmailOtp(@RequestBody Map<String, String> payload, HttpServletRequest httpRequest) {
        String clientIp = getClientIp(httpRequest);
        if (!rateLimitingService.tryConsumeAuth("email_otp_ip_" + clientIp)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", "Too many verification requests. Please wait a minute."));
        }

        String email = payload.get("email");
        try {
            Map<String, Object> result = otpService.sendEmailOtp(email);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Verifies email OTP and returns authenticated session token.
     */
    @PostMapping("/otp/verify-email")
    public ResponseEntity<?> verifyEmailOtp(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String otp = payload.get("otp");

        try {
            AuthResponse response = authService.authenticateEmailOtp(email, otp);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Link verified mobile number to authenticated user profile.
     */
    @PostMapping("/link/phone")
    public ResponseEntity<?> linkPhone(@RequestBody Map<String, String> payload, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
        }
        UserDetailsImpl principal = (UserDetailsImpl) authentication.getPrincipal();
        String phone = payload.get("phoneNumber");
        String otp = payload.get("otp");

        try {
            AuthResponse response = authService.linkPhone(principal.getId(), phone, otp);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Link verified email address to authenticated user profile.
     */
    @PostMapping("/link/email")
    public ResponseEntity<?> linkEmail(@RequestBody Map<String, String> payload, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
        }
        UserDetailsImpl principal = (UserDetailsImpl) authentication.getPrincipal();
        String email = payload.get("email");
        String otp = payload.get("otp");

        try {
            AuthResponse response = authService.linkEmail(principal.getId(), email, otp);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }
        return ResponseEntity.ok(authentication.getPrincipal());
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String jwt = authHeader.substring(7);
            tokenBlacklistService.blacklistToken(jwt);
        }
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(Map.of("message", "Logged out successfully. Session invalidated."));
    }

    private String getClientIp(HttpServletRequest request) {
        String cfIp = request.getHeader("CF-Connecting-IP");
        if (cfIp != null && !cfIp.isBlank()) {
            String candidate = cfIp.trim();
            if (candidate.matches("^[0-9a-fA-F:.]+$")) {
                return candidate;
            }
        }
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            String candidate = xf.split(",")[0].trim();
            if (candidate.matches("^[0-9a-fA-F:.]+$")) {
                return candidate;
            }
        }
        return request.getRemoteAddr();
    }
}

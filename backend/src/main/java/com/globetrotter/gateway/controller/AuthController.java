package com.globetrotter.gateway.controller;

import com.globetrotter.gateway.payload.AuthRequest;
import com.globetrotter.gateway.payload.AuthResponse;
import com.globetrotter.gateway.payload.RegisterRequest;
import com.globetrotter.gateway.security.TokenBlacklistService;
import com.globetrotter.gateway.service.AuthService;
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
    private final RateLimitingService rateLimitingService;
    private final TokenBlacklistService tokenBlacklistService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AuthRequest request, HttpServletRequest httpRequest) {
        String clientIp = getClientIp(httpRequest);
        String accountKey = request.getEmail() != null ? request.getEmail().toLowerCase().trim() : "anonymous";

        // Dual-Key Rate Limiting: Blocks both single-IP password spraying AND distributed botnet brute-forcing
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

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }
        return ResponseEntity.ok(authentication.getPrincipal());
    }

    /**
     * Session Termination & Revocation Endpoint.
     * Enforces Rule 11 (Session Revocation on Logout) from 20-Point Authentication Armor.
     */
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
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            String candidate = xf.split(",")[0].trim();
            // Basic sanity check: reject CRLF or suspicious strings
            if (candidate.matches("^[0-9a-fA-F:.]+$")) {
                return candidate;
            }
        }
        return request.getRemoteAddr();
    }
}

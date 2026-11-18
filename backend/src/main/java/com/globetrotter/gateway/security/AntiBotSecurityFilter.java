package com.globetrotter.gateway.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;

/**
 * AntiBotSecurityFilter — Enforces dynamic IP Quarantine Jail and Deceptive Honeypot traps
 * at the very edge of the HTTP filter chain (0.01ms latency).
 *
 * Jailed clients are immediately rejected before hitting Spring MVC controllers, ORM, or database.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@RequiredArgsConstructor
@Slf4j
public class AntiBotSecurityFilter extends OncePerRequestFilter {

    private final ProofOfWorkSecurityService proofOfWorkSecurityService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String clientIp = extractClientIp(request);
        String requestUri = request.getRequestURI();

        // 1. Check if client IP is currently quarantined in the IP Jail
        if (proofOfWorkSecurityService.isJailed(clientIp)) {
            ProofOfWorkSecurityService.JailRecord record = proofOfWorkSecurityService.getJailRecord(clientIp);
            long remaining = (record != null) ? record.getRemainingSeconds() : 3600;

            log.warn("Blocked request from quarantined IP: {} to URI: {}", clientIp, requestUri);
            response.setStatus(429);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");

            Map<String, Object> errorPayload = Map.of(
                    "status", 429,
                    "error", "IP_QUARANTINED",
                    "message", "Access restricted due to automated abuse detection. Your IP is quarantined.",
                    "remainingCooldownSeconds", remaining
            );
            response.getWriter().write(objectMapper.writeValueAsString(errorPayload));
            return;
        }

        // 2. Intercept Honeypot / Canary Trap accesses
        if ("/api/security/honeypot-trap".equals(requestUri) || requestUri.startsWith("/api/crawler-trap")) {
            proofOfWorkSecurityService.recordHoneypotTrigger(clientIp, "Deceptive URI: " + requestUri);

            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");

            Map<String, Object> errorPayload = Map.of(
                    "status", 403,
                    "error", "BOT_QUARANTINED",
                    "message", "Deceptive crawler trap tripped. IP has been placed in quarantine."
            );
            response.getWriter().write(objectMapper.writeValueAsString(errorPayload));
            return;
        }

        // 3. Check for obvious scraper / vulnerability scanner User-Agents
        String userAgent = request.getHeader("User-Agent");
        if (isMaliciousUserAgent(userAgent)) {
            proofOfWorkSecurityService.jailIp(clientIp, "Known scraper User-Agent: " + userAgent, java.time.Duration.ofHours(24));
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write(objectMapper.writeValueAsString(Map.of(
                    "status", 403,
                    "error", "ACCESS_DENIED",
                    "message", "Automated crawler User-Agent blocked."
            )));
            return;
        }

        // Request clean, proceed through normal filter chain
        filterChain.doFilter(request, response);
    }

    private String extractClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isBlank()) {
            return xRealIp.trim();
        }
        return request.getRemoteAddr();
    }

    private boolean isMaliciousUserAgent(String userAgent) {
        if (userAgent == null) return false;
        String lower = userAgent.toLowerCase();
        return lower.contains("sqlmap") ||
               lower.contains("nikto") ||
               lower.contains("masscan") ||
               lower.contains("zgrab") ||
               lower.contains("acunetix");
    }
}

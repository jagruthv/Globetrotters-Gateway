package com.globetrotter.gateway.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Global exception handler — converts all unhandled exceptions into clean,
 * consistent JSON error responses instead of exposing raw stack traces.
 *
 * Response format: { "status": 400, "error": "Bad Request", "message": "...", "path": "/api/..." }
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // ── Validation errors (@Valid / @NotBlank / @Email etc.) ──────────────────
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationErrors(
            MethodArgumentNotValidException ex, HttpServletRequest request) {

        String fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining("; "));

        return buildError(HttpStatus.BAD_REQUEST, "Validation Failed: " + fieldErrors, request.getRequestURI());
    }

    // ── Business logic errors (IllegalArgumentException) ──────────────────────
    // BookingService, VerificationService, etc. throw these for "not found" cases.
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(
            IllegalArgumentException ex, HttpServletRequest request) {
        return buildError(HttpStatus.BAD_REQUEST, ex.getMessage(), request.getRequestURI());
    }

    // ── Authentication errors ──────────────────────────────────────────────────
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, Object>> handleBadCredentials(
            BadCredentialsException ex, HttpServletRequest request) {
        return buildError(HttpStatus.UNAUTHORIZED, "Invalid email or password.", request.getRequestURI());
    }

    // ── Authorization errors ───────────────────────────────────────────────────
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(
            AccessDeniedException ex, HttpServletRequest request) {
        return buildError(HttpStatus.FORBIDDEN, "You do not have permission to access this resource.", request.getRequestURI());
    }

    // ── Catch-all: anything not handled above ──────────────────────────────────
    // Logs internally but never exposes stack trace to the client.
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleAll(
            Exception ex, HttpServletRequest request) {
        // Log the real error server-side (you'll see it in Spring logs)
        log.error("[GlobalExceptionHandler] Unhandled exception on {}: {}", request.getRequestURI(), ex.getMessage(), ex);
        return buildError(HttpStatus.INTERNAL_SERVER_ERROR,
                "An unexpected server error occurred. Please try again.",
                request.getRequestURI());
    }

    // ── Shared response builder ────────────────────────────────────────────────
    private ResponseEntity<Map<String, Object>> buildError(HttpStatus status, String message, String path) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message);
        body.put("path", path);
        return ResponseEntity.status(status).body(body);
    }
}

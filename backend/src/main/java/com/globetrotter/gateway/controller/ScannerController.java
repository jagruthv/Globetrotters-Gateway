package com.globetrotter.gateway.controller;

import com.globetrotter.gateway.payload.BookingResponse;
import com.globetrotter.gateway.payload.ScanRequest;
import com.globetrotter.gateway.payload.ScanResponse;
import com.globetrotter.gateway.service.BookingService;
import com.globetrotter.gateway.service.RateLimitingService;
import com.globetrotter.gateway.service.VerificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/verify")
@RequiredArgsConstructor
public class ScannerController {

    private final VerificationService verificationService;
    private final BookingService bookingService;
    private final RateLimitingService rateLimitingService;

    @PostMapping("/scan")
    public ResponseEntity<ScanResponse> scanTicket(
            Authentication authentication,
            @Valid @RequestBody ScanRequest request
    ) {
        String staffUsername = authentication != null ? authentication.getName() : "GateStaff";
        String terminalKey = request.getGateTerminalId() != null ? request.getGateTerminalId() : staffUsername;

        if (!rateLimitingService.tryConsumeScan(terminalKey)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(
                    ScanResponse.builder()
                            .valid(false)
                            .status("RATE_LIMITED")
                            .message("Scanner rate limit exceeded. Please wait a few seconds.")
                            .build()
            );
        }

        return ResponseEntity.ok(verificationService.verifyAndCheckIn(request, staffUsername));
    }

    @PostMapping("/batch-sync")
    public ResponseEntity<java.util.List<ScanResponse>> syncOfflineScans(
            Authentication authentication,
            @RequestBody java.util.List<ScanRequest> requests
    ) {
        String staffUsername = authentication != null ? authentication.getName() : "GateStaffOfflineSync";
        return ResponseEntity.ok(verificationService.batchSyncOfflineScans(requests, staffUsername));
    }

    @GetMapping("/pass/{passToken}")
    public ResponseEntity<BookingResponse> inspectPassDetails(@PathVariable String passToken) {
        try {
            return ResponseEntity.ok(bookingService.getBookingByToken(passToken));
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}

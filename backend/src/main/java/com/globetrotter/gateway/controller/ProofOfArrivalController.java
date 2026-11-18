package com.globetrotter.gateway.controller;

import com.globetrotter.gateway.payload.PoATokenRequest;
import com.globetrotter.gateway.payload.PoAVerificationResponse;
import com.globetrotter.gateway.service.ProofOfArrivalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/poa")
@RequiredArgsConstructor
@Tag(name = "Proof-of-Arrival (Cartel Mitigation & Fare Protection)", description = "Cryptographic tokens for price caps at remote checkpoints, ghat jeep unions, and forest barriers.")
public class ProofOfArrivalController {

    private final ProofOfArrivalService proofOfArrivalService;

    @PostMapping("/generate")
    @Operation(summary = "Generate a signed Proof-of-Arrival token for a destination")
    public ResponseEntity<Map<String, Object>> generateToken(@Valid @RequestBody PoATokenRequest request) {
        Map<String, Object> result = proofOfArrivalService.generatePoAToken(request);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/verify")
    @Operation(summary = "Verify a cryptographic Proof-of-Arrival token (POST body)")
    public ResponseEntity<PoAVerificationResponse> verifyTokenBody(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        PoAVerificationResponse response = proofOfArrivalService.verifyPoAToken(token);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/verify")
    @Operation(summary = "Verify a cryptographic Proof-of-Arrival token (GET query param for QR scanners)")
    public ResponseEntity<PoAVerificationResponse> verifyTokenQuery(@RequestParam("token") String token) {
        PoAVerificationResponse response = proofOfArrivalService.verifyPoAToken(token);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/qr")
    @Operation(summary = "Render the Proof-of-Arrival QR code image directly as PNG")
    public ResponseEntity<byte[]> getPoAQrCode(@RequestParam("token") String token) {
        try {
            byte[] imageBytes = proofOfArrivalService.generatePoAQrCode(token);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"poa_voucher.png\"")
                    .contentType(MediaType.IMAGE_PNG)
                    .body(imageBytes);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}

package com.globetrotter.gateway.controller;

import com.globetrotter.gateway.model.User;
import com.globetrotter.gateway.payload.CircuitPassResponse;
import com.globetrotter.gateway.payload.PassCreateRequest;
import com.globetrotter.gateway.repository.UserRepository;
import com.globetrotter.gateway.security.UserDetailsImpl;
import com.globetrotter.gateway.service.CircuitPassService;
import com.globetrotter.gateway.service.QrCodeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/passes")
@RequiredArgsConstructor
@Slf4j
public class CircuitPassController {

    private final CircuitPassService circuitPassService;
    private final UserRepository userRepository;
    private final QrCodeService qrCodeService;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<CircuitPassResponse> createPass(
            Authentication authentication,
            @Valid @RequestBody PassCreateRequest request
    ) {
        User user = extractUser(authentication);
        if (user == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(circuitPassService.issuePass(user.getId(), request));
    }

    @GetMapping("/{passId}")
    public ResponseEntity<CircuitPassResponse> getPass(@PathVariable String passId) {
        return ResponseEntity.ok(circuitPassService.getPassByPassId(passId));
    }

    @GetMapping("/my-passes")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<CircuitPassResponse>> getMyPasses(Authentication authentication) {
        User user = extractUser(authentication);
        if (user == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(circuitPassService.getPassesForUser(user.getId()));
    }

    @GetMapping("/{passId}/qr-image")
    public ResponseEntity<byte[]> getQrCodeImage(@PathVariable String passId) {
        try {
            CircuitPassResponse pass = circuitPassService.getPassByPassId(passId);
            byte[] imageBytes = qrCodeService.generateQrCodeImage(pass.getQrPayload(), 300, 300);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.IMAGE_PNG_VALUE)
                    .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                    .body(imageBytes);
        } catch (Exception e) {
            log.error("Failed to render QR image for pass {}: {}", passId, e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    private User extractUser(Authentication authentication) {
        if (authentication == null) {
            return null;
        }
        if (authentication.getPrincipal() instanceof UserDetailsImpl userDetails) {
            return userRepository.findById(userDetails.getId()).orElse(null);
        }
        String username = authentication.getName();
        return userRepository.findByEmail(username).orElse(null);
    }
}

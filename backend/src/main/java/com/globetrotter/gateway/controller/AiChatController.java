package com.globetrotter.gateway.controller;

import com.globetrotter.gateway.model.ChatMessage;
import com.globetrotter.gateway.payload.ChatMessageRequest;
import com.globetrotter.gateway.payload.ChatMessageResponse;
import com.globetrotter.gateway.service.AiTravelAssistantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class AiChatController {

    private final AiTravelAssistantService aiTravelAssistantService;
    private final com.globetrotter.gateway.service.AiModelRouterService aiModelRouterService;

    @PostMapping("/message")
    public ResponseEntity<ChatMessageResponse> sendMessage(
            Authentication authentication,
            @Valid @RequestBody ChatMessageRequest request
    ) {
        String userEmail = authentication != null ? authentication.getName() : "anonymous_tourist";
        return ResponseEntity.ok(aiTravelAssistantService.processMessage(userEmail, request));
    }

    private static final java.util.Set<String> ALLOWED_AUDIO_TYPES = java.util.Set.of(
            "audio/webm", "audio/wav", "audio/mp3", "audio/mpeg", "audio/ogg", "audio/m4a", "audio/x-m4a", "audio/mp4"
    );
    private static final long MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10MB limit

    @PostMapping("/transcribe")
    public ResponseEntity<java.util.Map<String, String>> transcribeVoice(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file
    ) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", "No audio file provided"));
        }

        if (file.getSize() > MAX_AUDIO_BYTES) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", "Audio file exceeds maximum 10MB upload limit"));
        }

        String contentType = file.getContentType();
        if (contentType != null && !ALLOWED_AUDIO_TYPES.contains(contentType.toLowerCase())) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", "Invalid file type. Only standard audio files (WebM, WAV, MP3, OGG, M4A) are allowed"));
        }

        try {
            byte[] bytes = file.getBytes();
            String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "voice.webm";
            String transcribed = aiModelRouterService.transcribeAudio(bytes, filename);
            if (transcribed != null) {
                return ResponseEntity.ok(java.util.Map.of("text", transcribed));
            }
            return ResponseEntity.status(503).body(java.util.Map.of("error", "Voice transcription model in cooldown or unavailable"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/history/{sessionId}")
    public ResponseEntity<List<ChatMessage>> getHistory(@PathVariable String sessionId) {
        return ResponseEntity.ok(aiTravelAssistantService.getChatHistory(sessionId));
    }
}

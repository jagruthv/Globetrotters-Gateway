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

    @PostMapping("/transcribe")
    public ResponseEntity<java.util.Map<String, String>> transcribeVoice(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file
    ) {
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

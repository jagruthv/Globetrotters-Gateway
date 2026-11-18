package com.globetrotter.gateway.payload;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ChatMessageRequest {
    private String sessionId;
    @NotBlank
    private String message;
}

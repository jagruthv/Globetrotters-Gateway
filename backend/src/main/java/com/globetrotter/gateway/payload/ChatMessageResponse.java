package com.globetrotter.gateway.payload;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageResponse {
    private String sessionId;
    private String reply;
    private List<String> suggestions;
    private LocalDateTime timestamp;
}

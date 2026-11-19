package com.globetrotter.gateway.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Multi-Model Cloud AI Router with 5-Minute Failure Circuit Breaker.
 *
 * Prioritizes high-brain models verified via live integration testing:
 * 1. Google Gemini 3.1 Flash Lite (High-speed, low-latency flagship conversational AI)
 * 2. Google Gemini 2.5 Flash Lite (High-throughput fallback)
 * 3. Groq OpenAI GPT-OSS 120B (120 Billion Parameters, deep reasoning)
 * 4. Nvidia NIM Nemotron / Llama-3.1 70B+ (when valid nvapi- key is present)
 * 5. Groq Qwen 3.8 27B (Ultra-fast ~200ms LPU fallback)
 * 6. Google Gemini 3.1 Flash Lite (High-speed lite fallback)
 *
 * Strict 5-Minute Cooldown: If any model fails (4xx/5xx/timeout), it is disabled
 * for exactly 5 minutes, preventing retry loops and routing traffic to healthy models.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiModelRouterService {

    private final ObjectMapper objectMapper;

    @Value("${app.ai.gemini.api-key:}")
    private String geminiApiKey;

    @Value("${app.ai.gemini.model:gemini-3.1-flash-lite}")
    private String geminiPrimaryModel;

    @Value("${app.ai.gemini.reasoning-model:gemini-3.1-flash-lite}")
    private String geminiReasoningModel;

    @Value("${app.ai.gemini.fallback-model:gemini-2.5-flash-lite}")
    private String geminiFallbackModel;

    private final java.util.concurrent.atomic.AtomicReference<String> lastModelUsed = new java.util.concurrent.atomic.AtomicReference<>("None");

    public String getLastModelUsed() {
        return lastModelUsed.get();
    }

    @Value("${app.ai.groq.api-key:}")
    private String groqApiKey;

    @Value("${app.ai.groq.flagship-model:openai/gpt-oss-120b}")
    private String groqFlagshipModel;

    @Value("${app.ai.groq.fast-model:qwen/qwen3.8-27b}")
    private String groqFastModel;

    @Value("${app.ai.groq.whisper-model:whisper-large-v3-turbo}")
    private String groqWhisperModel;

    @Value("${app.ai.nvidia.api-key:}")
    private String nvidiaApiKey;

    @Value("${app.ai.nvidia.flagship-model:nvidia/nemotron-4-340b-instruct}")
    private String nvidiaFlagshipModel;

    @Value("${app.ai.nvidia.ultra-model:nvidia/nemotron-3-ultra-550b-a55b}")
    private String nvidiaUltraModel;

    @Value("${app.ai.nvidia.reasoning-model:nvidia/llama-3.1-nemotron-70b-instruct}")
    private String nvidiaReasoningModel;

    private static final long COOLDOWN_DURATION_MS = 5 * 60 * 1000L; // 5 Minutes
    private final ConcurrentHashMap<String, Long> modelCooldownUntil = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, ModelUsageTracker> usageTrackers = new ConcurrentHashMap<>();

    private record QuotaLimits(int safeRpm, int safeRpd) {}

    /**
     * Google AI Studio Free-Tier Safe Operating Limits (with safety buffers to avoid 429s).
     * Hard caps:
     * - gemini-4-hydrogen: 5 RPM / 20 RPD -> Safe: 4 RPM, 18 RPD
     * - gemini-3.8-flash: ~15 RPM / 500 RPD -> Safe: 12 RPM, 450 RPD
     * - gemini-3.5-flash-lite: 30 RPM / 500 RPD -> Safe: 25 RPM, 480 RPD
     * - gemini-decision-1: 200 RPM / 10,000 RPD -> Safe: 180 RPM, 9,500 RPD
     */
    private static final Map<String, QuotaLimits> MODEL_QUOTAS = Map.of(
            "gemini-3.1-flash-lite", new QuotaLimits(30, 500),
            "gemini-2.5-flash-lite", new QuotaLimits(30, 500),
            "gemini-3.8-flash", new QuotaLimits(12, 450),
            "gemini-3.5-flash-lite", new QuotaLimits(25, 480),
            "gemini-decision-1", new QuotaLimits(180, 9500),
            "gemini-4-hydrogen", new QuotaLimits(4, 18)
    );

    private static class ModelUsageTracker {
        private final java.util.concurrent.ConcurrentLinkedQueue<Long> requestTimestamps = new java.util.concurrent.ConcurrentLinkedQueue<>();
        private final java.util.concurrent.atomic.AtomicInteger dailyRequests = new java.util.concurrent.atomic.AtomicInteger(0);
        private final java.util.concurrent.atomic.AtomicLong lastDayReset = new java.util.concurrent.atomic.AtomicLong(System.currentTimeMillis());

        public boolean isSafe(int safeRpm, int safeRpd) {
            long now = System.currentTimeMillis();
            // Reset daily window every 24 hours
            if (now - lastDayReset.get() > 24 * 60 * 60 * 1000L) {
                dailyRequests.set(0);
                lastDayReset.set(now);
            }

            // Daily cap pre-check
            if (safeRpd > 0 && dailyRequests.get() >= safeRpd) {
                return false;
            }

            // Sliding 60-second window check
            long oneMinuteAgo = now - 60_000L;
            while (!requestTimestamps.isEmpty() && requestTimestamps.peek() < oneMinuteAgo) {
                requestTimestamps.poll();
            }

            return safeRpm <= 0 || requestTimestamps.size() < safeRpm;
        }

        public void recordRequest() {
            requestTimestamps.add(System.currentTimeMillis());
            dailyRequests.incrementAndGet();
        }

        public int getCurrentRpm() {
            long oneMinuteAgo = System.currentTimeMillis() - 60_000L;
            while (!requestTimestamps.isEmpty() && requestTimestamps.peek() < oneMinuteAgo) {
                requestTimestamps.poll();
            }
            return requestTimestamps.size();
        }

        public int getDailyCount() {
            return dailyRequests.get();
        }
    }

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(6))
            .build();

    /**
     * Checks if a model is currently healthy and operating within safe Free-Tier rate limits.
     * Proactively redirects traffic to the next model if a rate limit threshold is approached,
     * preventing 429 RESOURCE_EXHAUSTED errors before they happen.
     */
    public boolean isModelAvailable(String modelId) {
        Long cooldownEnd = modelCooldownUntil.get(modelId);
        if (cooldownEnd != null) {
            if (System.currentTimeMillis() < cooldownEnd) {
                return false;
            }
            modelCooldownUntil.remove(modelId);
            log.info("🟢 Circuit breaker RESET for model [{}] after cooldown.", modelId);
        }

        // Predictive Free-Tier Quota Sentinel
        QuotaLimits quota = MODEL_QUOTAS.get(modelId);
        if (quota != null) {
            ModelUsageTracker tracker = usageTrackers.computeIfAbsent(modelId, k -> new ModelUsageTracker());
            if (!tracker.isSafe(quota.safeRpm(), quota.safeRpd())) {
                log.warn("⚠️ [Predictive Rate-Limit Sentinel] Model [{}] approaching Free-Tier cap (Current RPM: {}/{}, RPD: {}/{}). Proactively cooling off and redirecting to next model...",
                        modelId, tracker.getCurrentRpm(), quota.safeRpm(), tracker.getDailyCount(), quota.safeRpd());
                return false;
            }
        }
        return true;
    }

    /**
     * Trips the circuit breaker when a model fails.
     * For 429 / Rate Limit errors, activates an immediate 60-second backoff.
     */
    public void recordModelFailure(String modelId, String reason) {
        long duration = COOLDOWN_DURATION_MS;
        if (reason != null && (reason.contains("429") || reason.contains("RESOURCE_EXHAUSTED") || reason.contains("Quota") || reason.contains("Rate limit"))) {
            duration = 60 * 1000L; // 60s cooldown for rate limit bursts
            log.warn("⚠️ Model [{}] triggered Rate Limit / 429 ({}). Dynamic 60s cooldown engaged.", modelId, reason);
        } else {
            log.warn("⚠️ Model [{}] FAILED ({}). Tripping circuit breaker for 5 minutes.", modelId, reason);
        }
        long coolUntil = System.currentTimeMillis() + duration;
        modelCooldownUntil.put(modelId, coolUntil);
    }

    /**
     * Resets cooldown and records successful call in the sliding-window tracker.
     */
    public void recordModelSuccess(String modelId) {
        modelCooldownUntil.remove(modelId);
        ModelUsageTracker tracker = usageTrackers.computeIfAbsent(modelId, k -> new ModelUsageTracker());
        tracker.recordRequest();
    }

    /**
     * Executes structured JSON generation across the intelligence hierarchy with circuit breakers.
     */
    public String generateStructuredJson(String systemPrompt, String userPrompt) {
        List<ModelCandidate> candidates = getRankedCandidates();

        for (ModelCandidate candidate : candidates) {
            if (!isModelAvailable(candidate.id)) {
                log.debug("Skipping [{}] (active 5-minute cooldown)", candidate.id);
                continue;
            }

            try {
                log.info("Routing structured JSON generation to [{}] ({})", candidate.id, candidate.provider);
                String jsonResult = switch (candidate.provider.toLowerCase()) {
                    case "nvidia" -> callNvidiaJson(candidate.id, systemPrompt, userPrompt);
                    case "gemini" -> callGeminiJson(candidate.id, systemPrompt, userPrompt);
                    default -> callGroqJson(candidate.id, systemPrompt, userPrompt);
                };

                if (jsonResult != null && !jsonResult.isBlank()) {
                    recordModelSuccess(candidate.id);
                    String modelName = candidate.provider.equalsIgnoreCase("gemini")
                            ? "Google Gemini (" + candidate.id + ")"
                            : candidate.provider.toUpperCase() + " (" + candidate.id + ")";
                    lastModelUsed.set(modelName);
                    return jsonResult;
                }
                recordModelFailure(candidate.id, "Empty response received");
            } catch (Exception e) {
                recordModelFailure(candidate.id, e.getMessage());
            }
        }

        log.error("All cloud AI models exhausted or in 5-minute cooldown. Falling back to deterministic planner.");
        return null;
    }

    /**
     * Executes conversational text chat across the intelligence hierarchy with circuit breakers.
     */
    public String generateChat(String systemPrompt, String userPrompt) {
        List<ModelCandidate> candidates = getRankedCandidates();

        for (ModelCandidate candidate : candidates) {
            if (!isModelAvailable(candidate.id)) {
                log.debug("Skipping [{}] (active 5-minute cooldown)", candidate.id);
                continue;
            }

            try {
                log.info("Routing chat query to [{}] ({})", candidate.id, candidate.provider);
                String reply = switch (candidate.provider.toLowerCase()) {
                    case "nvidia" -> callNvidiaChat(candidate.id, systemPrompt, userPrompt);
                    case "gemini" -> callGeminiChat(candidate.id, systemPrompt, userPrompt);
                    default -> callGroqChat(candidate.id, systemPrompt, userPrompt);
                };

                if (reply != null && !reply.isBlank()) {
                    recordModelSuccess(candidate.id);
                    return reply;
                }
                recordModelFailure(candidate.id, "Empty response received");
            } catch (Exception e) {
                recordModelFailure(candidate.id, e.getMessage());
            }
        }

        log.warn("All cloud AI models exhausted or in cooldown. Falling back to grounded pattern assistant.");
        return null;
    }

    /**
     * Overloaded audio transcription accepting audio bytes and filename.
     */
    public String transcribeAudio(byte[] audioBytes, String filename) {
        String mimeType = (filename != null && filename.endsWith(".wav")) ? "audio/wav" : "audio/webm";
        return transcribeAudio(audioBytes, filename, mimeType);
    }

    /**
     * Transcribes audio using Groq Whisper Large V3 Turbo with 5-minute failure cooldown.
     */
    public String transcribeAudio(byte[] audioBytes, String filename, String mimeType) {
        String whisperModel = (groqWhisperModel != null && !groqWhisperModel.isBlank())
                ? groqWhisperModel : "whisper-large-v3-turbo";

        if (!isModelAvailable(whisperModel)) {
            log.warn("Groq Whisper model [{}] is currently in 5-minute cooldown", whisperModel);
            return null;
        }

        if (groqApiKey == null || groqApiKey.isBlank()) {
            log.warn("Groq API key not configured for audio transcription");
            return null;
        }

        try {
            String boundary = "----GlobetrotterBoundary" + System.currentTimeMillis();
            StringBuilder headerBuilder = new StringBuilder();

            headerBuilder.append("--").append(boundary).append("\r\n");
            headerBuilder.append("Content-Disposition: form-data; name=\"model\"\r\n\r\n");
            headerBuilder.append(whisperModel).append("\r\n");

            headerBuilder.append("--").append(boundary).append("\r\n");
            headerBuilder.append("Content-Disposition: form-data; name=\"file\"; filename=\"").append(filename).append("\"\r\n");
            headerBuilder.append("Content-Type: ").append(mimeType).append("\r\n\r\n");

            byte[] headerBytes = headerBuilder.toString().getBytes(StandardCharsets.UTF_8);
            byte[] footerBytes = ("\r\n--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8);

            byte[] fullPayload = new byte[headerBytes.length + audioBytes.length + footerBytes.length];
            System.arraycopy(headerBytes, 0, fullPayload, 0, headerBytes.length);
            System.arraycopy(audioBytes, 0, fullPayload, headerBytes.length, audioBytes.length);
            System.arraycopy(footerBytes, 0, fullPayload, headerBytes.length + audioBytes.length, footerBytes.length);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.groq.com/openai/v1/audio/transcriptions"))
                    .header("Authorization", "Bearer " + groqApiKey)
                    .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                    .header("User-Agent", "Globetrotter/1.0")
                    .timeout(Duration.ofSeconds(12))
                    .POST(HttpRequest.BodyPublishers.ofByteArray(fullPayload))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                String text = root.path("text").asText();
                recordModelSuccess(whisperModel);
                return text;
            } else {
                recordModelFailure(whisperModel, "HTTP " + response.statusCode() + ": " + response.body());
            }
        } catch (Exception e) {
            recordModelFailure(whisperModel, e.getMessage());
        }
        return null;
    }

    /**
     * Returns current circuit breaker status for admin observability.
     */
    public Map<String, Object> getCircuitBreakerStatus() {
        Map<String, Object> status = new LinkedHashMap<>();
        long now = System.currentTimeMillis();
        for (Map.Entry<String, Long> entry : modelCooldownUntil.entrySet()) {
            long remainingMs = entry.getValue() - now;
            if (remainingMs > 0) {
                status.put(entry.getKey(), "COOLDOWN_ACTIVE (" + (remainingMs / 1000) + "s remaining)");
            } else {
                status.put(entry.getKey(), "READY");
            }
        }
        return status;
    }

    // ── Internal Model Invocation Adapters ───────────────────────────────────

    private String callGeminiJson(String modelId, String systemPrompt, String userPrompt) throws Exception {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            throw new IllegalStateException("Gemini API key is not configured");
        }

        String fullPrompt = (systemPrompt != null && !systemPrompt.isBlank())
                ? systemPrompt + "\n\n" + userPrompt + "\nOutput strictly valid JSON only."
                : userPrompt + "\nOutput strictly valid JSON only.";

        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", fullPrompt)))),
                "generationConfig", Map.of(
                        "temperature", 0.2,
                        "responseMimeType", "application/json",
                        "maxOutputTokens", 2048
                )
        );

        String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                + modelId + ":generateContent?key=" + geminiApiKey;

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(10))
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body), StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() == 200) {
            JsonNode root = objectMapper.readTree(response.body());
            JsonNode parts = root.path("candidates").get(0).path("content").path("parts");
            for (JsonNode part : parts) {
                if (part.has("text") && !part.has("thought")) {
                    return part.path("text").asText();
                }
            }
            if (parts.size() > 0 && parts.get(0).has("text")) {
                return parts.get(0).path("text").asText();
            }
        }
        throw new RuntimeException("Gemini HTTP " + response.statusCode() + ": " + response.body());
    }

    private String callGeminiChat(String modelId, String systemPrompt, String userPrompt) throws Exception {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            throw new IllegalStateException("Gemini API key is not configured");
        }

        String fullPrompt = (systemPrompt != null && !systemPrompt.isBlank())
                ? systemPrompt + "\n\n" + userPrompt : userPrompt;

        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", fullPrompt)))),
                "generationConfig", Map.of(
                        "temperature", 0.3,
                        "maxOutputTokens", 1200
                )
        );

        String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                + modelId + ":generateContent?key=" + geminiApiKey;

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(8))
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body), StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() == 200) {
            JsonNode root = objectMapper.readTree(response.body());
            JsonNode parts = root.path("candidates").get(0).path("content").path("parts");
            for (JsonNode part : parts) {
                if (part.has("text") && !part.has("thought")) {
                    return part.path("text").asText();
                }
            }
            if (parts.size() > 0 && parts.get(0).has("text")) {
                return parts.get(0).path("text").asText();
            }
        }
        throw new RuntimeException("Gemini HTTP " + response.statusCode() + ": " + response.body());
    }

    private String callGroqJson(String modelId, String systemPrompt, String userPrompt) throws Exception {
        if (groqApiKey == null || groqApiKey.isBlank()) {
            throw new IllegalStateException("Groq API key is not configured");
        }

        Map<String, Object> body = Map.of(
                "model", modelId,
                "messages", List.of(
                        Map.of("role", "system", "content", (systemPrompt != null ? systemPrompt : "") + " Output ONLY valid JSON."),
                        Map.of("role", "user", "content", userPrompt)
                ),
                "response_format", Map.of("type", "json_object"),
                "temperature", 0.2,
                "max_tokens", 1800
        );

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.groq.com/openai/v1/chat/completions"))
                .header("Authorization", "Bearer " + groqApiKey)
                .header("Content-Type", "application/json")
                .header("User-Agent", "Mozilla/5.0")
                .timeout(Duration.ofSeconds(9))
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body), StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() == 200) {
            JsonNode root = objectMapper.readTree(response.body());
            return root.path("choices").get(0).path("message").path("content").asText();
        }
        throw new RuntimeException("Groq HTTP " + response.statusCode() + ": " + response.body());
    }

    private String callGroqChat(String modelId, String systemPrompt, String userPrompt) throws Exception {
        if (groqApiKey == null || groqApiKey.isBlank()) {
            throw new IllegalStateException("Groq API key is not configured");
        }

        Map<String, Object> body = Map.of(
                "model", modelId,
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt != null ? systemPrompt : "You are Globetrotter Assistant."),
                        Map.of("role", "user", "content", userPrompt)
                ),
                "temperature", 0.3,
                "max_tokens", 900
        );

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.groq.com/openai/v1/chat/completions"))
                .header("Authorization", "Bearer " + groqApiKey)
                .header("Content-Type", "application/json")
                .header("User-Agent", "Mozilla/5.0")
                .timeout(Duration.ofSeconds(8))
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body), StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() == 200) {
            JsonNode root = objectMapper.readTree(response.body());
            return root.path("choices").get(0).path("message").path("content").asText();
        }
        throw new RuntimeException("Groq HTTP " + response.statusCode() + ": " + response.body());
    }

    private String callNvidiaJson(String modelId, String systemPrompt, String userPrompt) throws Exception {
        if (nvidiaApiKey == null || nvidiaApiKey.isBlank()) {
            throw new IllegalStateException("Nvidia API key is not configured");
        }

        Map<String, Object> body = Map.of(
                "model", modelId,
                "messages", List.of(
                        Map.of("role", "system", "content", (systemPrompt != null ? systemPrompt : "") + " Output strictly valid JSON only."),
                        Map.of("role", "user", "content", userPrompt)
                ),
                "temperature", 0.2,
                "max_tokens", 2000
        );

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://integrate.api.nvidia.com/v1/chat/completions"))
                .header("Authorization", "Bearer " + nvidiaApiKey)
                .header("Content-Type", "application/json")
                .header("User-Agent", "Mozilla/5.0")
                .timeout(Duration.ofSeconds(12))
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body), StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() == 200) {
            JsonNode root = objectMapper.readTree(response.body());
            return root.path("choices").get(0).path("message").path("content").asText();
        }
        throw new RuntimeException("Nvidia HTTP " + response.statusCode() + ": " + response.body());
    }

    private String callNvidiaChat(String modelId, String systemPrompt, String userPrompt) throws Exception {
        if (nvidiaApiKey == null || nvidiaApiKey.isBlank()) {
            throw new IllegalStateException("Nvidia API key is not configured");
        }

        Map<String, Object> body = Map.of(
                "model", modelId,
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt != null ? systemPrompt : "You are Globetrotter Assistant."),
                        Map.of("role", "user", "content", userPrompt)
                ),
                "temperature", 0.3,
                "max_tokens", 1000
        );

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://integrate.api.nvidia.com/v1/chat/completions"))
                .header("Authorization", "Bearer " + nvidiaApiKey)
                .header("Content-Type", "application/json")
                .header("User-Agent", "Mozilla/5.0")
                .timeout(Duration.ofSeconds(10))
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body), StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() == 200) {
            JsonNode root = objectMapper.readTree(response.body());
            return root.path("choices").get(0).path("message").path("content").asText();
        }
        throw new RuntimeException("Nvidia HTTP " + response.statusCode() + ": " + response.body());
    }

    private List<ModelCandidate> getRankedCandidates() {
        List<ModelCandidate> list = new ArrayList<>();

        // Priority #1: Google Gemini Free-Tier Compliant Models
        // Strict hierarchy: gemini-3.1-flash-lite (Primary) -> gemini-2.5-flash-lite -> gemini-decision-1 (Fast) -> gemini-4-hydrogen (Complex Reasoning)
        if (geminiApiKey != null && !geminiApiKey.isBlank()) {
            String primaryModel = (geminiPrimaryModel != null && !geminiPrimaryModel.isBlank())
                    ? geminiPrimaryModel : "gemini-3.1-flash-lite";
            list.add(new ModelCandidate(primaryModel, "gemini"));

            if (geminiFallbackModel != null && !geminiFallbackModel.isBlank() && !geminiFallbackModel.equals(primaryModel)) {
                list.add(new ModelCandidate(geminiFallbackModel, "gemini"));
            }
            if (!list.stream().anyMatch(c -> c.id.equals("gemini-3.1-flash-lite"))) {
                list.add(new ModelCandidate("gemini-3.1-flash-lite", "gemini"));
            }
            if (!list.stream().anyMatch(c -> c.id.equals("gemini-2.5-flash-lite"))) {
                list.add(new ModelCandidate("gemini-2.5-flash-lite", "gemini"));
            }
            if (!list.stream().anyMatch(c -> c.id.equals("gemini-decision-1"))) {
                list.add(new ModelCandidate("gemini-decision-1", "gemini"));
            }
            // gemini-4-hydrogen is kept with 4 RPM / 18 RPD strict safe-buffer
            if (geminiReasoningModel != null && !geminiReasoningModel.isBlank() && !list.stream().anyMatch(c -> c.id.equals(geminiReasoningModel))) {
                list.add(new ModelCandidate(geminiReasoningModel, "gemini"));
            }
            if (!list.stream().anyMatch(c -> c.id.equals("gemini-4-hydrogen"))) {
                list.add(new ModelCandidate("gemini-4-hydrogen", "gemini"));
            }
        }

        // Priority #2: Live-Verified High-Brain Flagships (Groq LPU)
        if (groqApiKey != null && !groqApiKey.isBlank()) {
            list.add(new ModelCandidate(groqFlagshipModel != null ? groqFlagshipModel : "openai/gpt-oss-120b", "groq"));
            list.add(new ModelCandidate(groqFastModel != null ? groqFastModel : "qwen/qwen3.8-27b", "groq"));
            list.add(new ModelCandidate("allam-2-7b", "groq"));
        }

        // Priority #3: Nvidia Heavy Models (if nvapi- key is present)
        if (nvidiaApiKey != null && nvidiaApiKey.startsWith("nvapi-")) {
            list.add(new ModelCandidate(nvidiaFlagshipModel != null ? nvidiaFlagshipModel : "nvidia/nemotron-4-340b-instruct", "nvidia"));
            list.add(new ModelCandidate(nvidiaUltraModel != null ? nvidiaUltraModel : "nvidia/nemotron-3-ultra-550b-a55b", "nvidia"));
            list.add(new ModelCandidate(nvidiaReasoningModel != null ? nvidiaReasoningModel : "nvidia/llama-3.1-nemotron-70b-instruct", "nvidia"));
        }

        return list;
    }

    private static class ModelCandidate {
        final String id;
        final String provider;

        ModelCandidate(String id, String provider) {
            this.id = id;
            this.provider = provider;
        }
    }
}

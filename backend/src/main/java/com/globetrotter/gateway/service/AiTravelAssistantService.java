package com.globetrotter.gateway.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.globetrotter.gateway.model.ChatMessage;
import com.globetrotter.gateway.model.Circuit;
import com.globetrotter.gateway.model.Place;
import com.globetrotter.gateway.payload.ChatMessageRequest;
import com.globetrotter.gateway.payload.ChatMessageResponse;
import com.globetrotter.gateway.repository.ChatMessageRepository;
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
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiTravelAssistantService {

    private final ChatMessageRepository chatMessageRepository;
    private final CircuitService circuitService;
    private final PlaceService placeService;
    private final ObjectMapper objectMapper;
    private final AiModelRouterService aiModelRouterService;

    @Value("${app.gemini.api-key:}")
    private String geminiApiKey;

    @Value("${app.gemini.model:gemini-1.5-flash}")
    private String geminiModel;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(4))
            .build();

    public ChatMessageResponse processMessage(String userEmail, ChatMessageRequest request) {
        String sessionId = request.getSessionId();
        if (sessionId == null || sessionId.isBlank()) {
            sessionId = UUID.randomUUID().toString();
        }

        String userQuery = request.getMessage().trim();

        // 1. Persist User Message
        chatMessageRepository.save(ChatMessage.builder()
                .sessionId(sessionId)
                .userEmail(userEmail)
                .sender("user")
                .content(userQuery)
                .build());

        // 2. Fetch ground-truth context from high-speed in-memory Caffeine cache (<1ms)
        List<Circuit> circuits = circuitService.getAllActiveCircuits();
        List<Place> places = placeService.getAllActivePlaces();

        // 3. Generate grounded travel assistant guidance via multi-model router (5-min circuit breaker)
        AssistantResult result = callAiRouter(userQuery, circuits, places);

        if (result == null) {
            result = generateGroundedAnswer(userQuery, circuits, places);
        }

        // 4. Persist Assistant Reply
        chatMessageRepository.save(ChatMessage.builder()
                .sessionId(sessionId)
                .userEmail(userEmail)
                .sender("assistant")
                .content(result.reply)
                .build());

        return ChatMessageResponse.builder()
                .sessionId(sessionId)
                .reply(result.reply)
                .suggestions(result.suggestions)
                .timestamp(LocalDateTime.now())
                .build();
    }

    public List<ChatMessage> getChatHistory(String sessionId) {
        return chatMessageRepository.findBySessionIdOrderByTimestampAsc(sessionId);
    }

    private AssistantResult generateGroundedAnswer(String query, List<Circuit> circuits, List<Place> places) {
        String lower = query.toLowerCase();

        // Indic Language Fallback: Telugu
        if (lower.contains("telugu") || lower.contains("తెలుగు") || query.chars().anyMatch(c -> c >= 0x0C00 && c <= 0x0C7F)) {
            String reply = "నమస్కారం! నేను మీ **గ్లోబ్‌ట్రాటర్ AI ట్రావెల్ అసిస్టెంట్** 🌍.\n\n"
                    + "మీకు మా ప్రముఖ పర్యాటక సర్క్యూట్‌ల గురించి సహాయం చేయగలను:\n"
                    + "• **విశాఖపట్నం హెరిటేజ్ సర్క్యూట్**: కైలాసగిరి, ఆర్కే బీచ్, సబ్‌మెరైన్ మ్యూజియం & విమాన మ్యూజియం (కేవలం ₹299)\n"
                    + "• **అరకు వ్యాలీ & బొర్రా గుహలు**: గిరిజన సంస్కృతి & సహజ గుహల దర్శనం (₹349)\n"
                    + "• **తిరుపతి టెంపుల్ సర్క్యూట్**: పవిత్ర దేవాలయాల దర్శనం (₹499)\n\n"
                    + "💡 సింగిల్ క్యూఆర్ పాస్‌తో అన్ని గేట్ల వద్ద క్యూ లేకుండా నేరుగా ప్రవేశించవచ్చు!";
            return new AssistantResult(reply, List.of(
                    "సబ్‌మెరైన్ మ్యూజియం సమయాలు ఏమిటి?",
                    "ఆర్కే బీచ్ వద్ద మంచి భోజనం ఎక్కడ లభిస్తుంది?",
                    "డిజిటల్ పాస్ ఎలా బుక్ చేయాలి?"
            ));
        }

        // Indic Language Fallback: Hindi
        if (lower.contains("hindi") || lower.contains("हिन्दी") || query.chars().anyMatch(c -> c >= 0x0900 && c <= 0x097F)) {
            String reply = "नमस्ते! मैं आपका **ग्लोबट्रॉटर AI यात्रा सहायक** 🌍 हूँ।\n\n"
                    + "मैं आपको आंध्र प्रदेश और तेलंगाना के प्रमुख पर्यटन सर्किटों की पूरी जानकारी दे सकता हूँ:\n"
                    + "• **विशाखापत्तनम हेरिटेज सर्किट**: कैलासगिरि, आरके बीच, पनडुब्बी संग्रहालय (केवल ₹299)\n"
                    + "• **अराकू घाटी एवं बोर्रा गुफाएँ**: आदिवासी संस्कृति और प्राकृतिक गुफाएँ (केवल ₹349)\n"
                    + "• **हैदराबाद हेरिटेज सर्किट**: चारमीनार, गोलकोंडा किला, सालारजंग संग्रहालय (केवल ₹399)\n\n"
                    + "💡 एक ही डिजिटल क्यूआर पास से सभी स्मारकों पर बिना कतार के सीधे प्रवेश मिलता है!";
            return new AssistantResult(reply, List.of(
                    "पनडुब्बी संग्रहालय (Submarine Museum) का समय क्या है?",
                    "आरके बीच के पास अच्छा स्थानीय भोजन कहाँ मिलेगा?",
                    "डिजिटल क्यूआर पास कैसे बुक करें?"
            ));
        }

        // Scenario 1: One-day trip / circuit recommendations
        if (lower.contains("one day") || lower.contains("1 day") || lower.contains("recommend") || lower.contains("best circuit") || lower.contains("which circuit")) {
            Optional<Circuit> vizagCircuit = circuits.stream()
                    .filter(c -> c.getTitle().toLowerCase().contains("heritage") || c.getTitle().toLowerCase().contains("vizag"))
                    .findFirst();

            String circuitName = vizagCircuit.map(Circuit::getTitle).orElse("Vizag Heritage Circuit");
            String circuitPrice = vizagCircuit.map(c -> "₹" + c.getDiscountedCircuitPrice()).orElse("₹499");

            String reply = "🌟 **Top Recommendation for a 1-Day Trip:**\n\n"
                    + "I recommend booking the **" + circuitName + "** (" + circuitPrice + " per person). \n\n"
                    + "📍 **Covered Attractions with 1 QR Pass:**\n"
                    + "1. **Kailasagiri Hilltop** - Panoramic coastal views & ropeway (Morning: 9:00 AM - 11:30 AM)\n"
                    + "2. **RK Beach & Coastal Promenade** - Scenic beach walk & street food (12:00 PM - 1:30 PM)\n"
                    + "3. **INS Kurusura Submarine Museum** - Historic submarine interior tour (2:30 PM - 4:00 PM)\n"
                    + "4. **TU 142 Aircraft Museum** - Decommissioned naval aircraft exhibition (4:30 PM - 6:00 PM)\n\n"
                    + "💡 **Why this circuit?** You save ~35% compared to separate admissions and skip ticket queues at all 4 gates with your single digital pass!";

            List<String> suggestions = List.of(
                    "What are Submarine Museum timings?",
                    "Where can I eat lunch near RK Beach?",
                    "How does the QR pass work?"
            );
            return new AssistantResult(reply, suggestions);
        }

        // Scenario 2: Timings / Hours inquiry
        if (lower.contains("timing") || lower.contains("hours") || lower.contains("open") || lower.contains("close")) {
            List<Place> matched = places.stream()
                    .filter(p -> lower.contains(p.getName().toLowerCase()) ||
                            (p.getDistrict() != null && lower.contains(p.getDistrict().toLowerCase().replace(" district", ""))))
                    .limit(8)
                    .toList();

            List<Place> displayPlaces = matched.isEmpty() ? places.stream().limit(8).toList() : matched;

            StringBuilder sb = new StringBuilder("⏰ **Current Attraction Timings & Access Hours:**\n\n");
            for (Place p : displayPlaces) {
                sb.append("• **").append(p.getName()).append("**: ")
                        .append(p.getOpeningTime()).append(" - ").append(p.getClosingTime())
                        .append(" (").append(p.getCategory()).append(", ").append(p.getDistrict()).append(")\n");
            }
            if (matched.isEmpty()) {
                sb.append("\n*Showing key corridor attractions. Ask for any specific spot or district for precise schedules.*");
            }
            sb.append("\n💡 *Pro-tip: Entry gates close 30 minutes before official attraction closing time.*");

            return new AssistantResult(sb.toString(), List.of(
                    "Recommend best time to visit Kailasagiri",
                    "How do I reach Submarine Museum?",
                    "Book Vizag Heritage Circuit"
            ));
        }

        // Scenario 3: How QR pass works
        if (lower.contains("qr") || lower.contains("pass") || lower.contains("ticket") || lower.contains("work")) {
            String reply = "🎫 **How the Digital QR Pass Works:**\n\n"
                    + "1. **One Booking, One Pass:** Select any tour package or destination and confirm your travel date.\n"
                    + "2. **Instant QR Generation:** Your digital pass is immediately created with a secure QR code.\n"
                    + "3. **Quick Entry:** At every attraction gate, simply present your QR pass on your phone.\n"
                    + "4. **Direct Gate Verification:** The gate scanner verifies that specific attraction and allows instant entry!";

            return new AssistantResult(reply, List.of(
                    "View popular tour packages",
                    "Can multiple people use one pass?",
                    "What if my pass is expired?"
            ));
        }

        // Scenario 4: Food / Restaurants
        if (lower.contains("eat") || lower.contains("food") || lower.contains("restaurant") || lower.contains("lunch")) {
            String reply = "🍽️ **Recommended Dining Near Attraction Circuits:**\n\n"
                    + "• **Near RK Beach & Museums:** \n"
                    + "  - *The Park Hotel Beachfront Diner* - Seafood & Coastal Andhra Thali\n"
                    + "  - *Sea Inn (Raju Gari Dhaba)* - Famous spicy Andhra style chicken & mutton biryani\n"
                    + "  - *Maddi's Shoreline Cafe* - Great evening snacks & coffee by the ocean\n\n"
                    + "• **Near Kailasagiri:** \n"
                    + "  - *Titanic View Restaurant* atop the hill with 360° bay views.";

            return new AssistantResult(reply, List.of(
                    "Suggest 1-day tour plan with meals",
                    "What should I carry for the beach?",
                    "Is photography allowed in museums?"
            ));
        }

        // Default Intelligent Fallback grounded with catalog summary
        String circuitTitles = circuits.stream().map(Circuit::getTitle).collect(Collectors.joining(", "));
        String reply = "Hello! I am your **Globetrotter AI Travel Guide** 🌍.\n\n"
                + "I can help you explore Andhra Pradesh & Telangana: **" + circuitTitles + "**.\n\n"
                + "Feel free to ask me about:\n"
                + "• Recommended day-by-day tour plans based on your schedule\n"
                + "• Gate timings, ticket pricing, and bundle savings\n"
                + "• Driving directions between places\n"
                + "• Famous local food and photography rules";

        return new AssistantResult(reply, List.of(
                "Best tour plan for a 1-day trip?",
                "What are the attraction timings?",
                "How does the digital QR pass work?"
        ));
    }

    private AssistantResult callAiRouter(String query, List<Circuit> circuits, List<Place> places) {
        try {
            StringBuilder context = new StringBuilder();
            context.append("LIVE CIRCUITS CATALOG:\n");
            for (Circuit c : circuits) {
                context.append("- ").append(c.getTitle())
                        .append(" (Price: ₹").append(c.getDiscountedCircuitPrice())
                        .append(", Validity: ").append(c.getValidityDays()).append(" days): ")
                        .append(c.getSummary()).append("\n");
            }
            // Filter places to keep context tight and avoid Groq TPM/timeout issues
            String lowerQuery = query.toLowerCase();
            List<Place> relevantPlaces = places.stream()
                    .filter(p -> lowerQuery.contains(p.getName().toLowerCase())
                            || (p.getDistrict() != null && lowerQuery.contains(p.getDistrict().toLowerCase()))
                            || (p.getCity() != null && lowerQuery.contains(p.getCity().toLowerCase()))
                            || (p.getCategory() != null && lowerQuery.contains(p.getCategory().toLowerCase())))
                    .limit(15)
                    .collect(Collectors.toList());

            if (relevantPlaces.isEmpty()) {
                relevantPlaces = places.stream().limit(12).collect(Collectors.toList());
            }

            context.append("\nFEATURED / RELEVANT ATTRACTIONS:\n");
            for (Place p : relevantPlaces) {
                context.append("- ").append(p.getName())
                        .append(" [").append(p.getDistrict() != null ? p.getDistrict() : p.getCity()).append("]")
                        .append(" (Hours: ").append(p.getOpeningTime() != null ? p.getOpeningTime() : "09:00 AM")
                        .append("-").append(p.getClosingTime() != null ? p.getClosingTime() : "06:00 PM")
                        .append(", Fee: ₹").append(p.getIndividualPrice()).append("): ")
                        .append(p.getDescription() != null && p.getDescription().length() > 100 
                                ? p.getDescription().substring(0, 100) + "..." : p.getDescription()).append("\n");
            }

            String systemPrompt = "You are Globetrotter's AI Travel Guide & Tour Co-Pilot for Andhra Pradesh and Telangana.\n"
                    + "Help Indian tourists and families optimize their travel plans, understand why destinations were sequenced, suggest authentic regional dining (Bamboo Chicken, Pootharekulu, Andhra meals, Hyderabadi Biryani, etc.), advise on temple darshan timings, elder-friendly travel, and weather trade-offs.\n"
                    + "CRITICAL VOCABULARY RULE: Always use warm, everyday Indian travel words. Refer to schedules as 'Day-by-Day Tour Plan' or 'Trip Plan'. NEVER use words like 'itinerary', 'dossier', or 'turnstile' as normal Indian tourists find them unfamiliar. Refer to passes as 'Digital QR Pass' or 'Tour Package'.\n"
                    + "Be friendly, warm, precise, and use clean markdown formatting.\n"
                    + "GROUND TRUTH HIGHLIGHTS:\n" + context + "\n\n"
                    + "Format guidelines:\n"
                    + "1. Answer directly and thoughtfully.\n"
                    + "2. At the end of your response, strictly output 3 suggested follow-up questions in this format:\n"
                    + "SUGGESTIONS:\n"
                    + "- suggestion 1\n"
                    + "- suggestion 2\n"
                    + "- suggestion 3";

            String rawReply = aiModelRouterService.generateChat(systemPrompt, query);
            if (rawReply != null && !rawReply.isBlank()) {
                return parseGeminiOutput(rawReply);
            }
        } catch (Exception e) {
            log.warn("Multi-model AI router invocation failed ({}), falling back to offline matcher", e.getMessage());
        }
        return null;
    }

    private AssistantResult parseGeminiOutput(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }

        String reply = text;
        List<String> suggestions = new ArrayList<>();

        int suggestionsIdx = text.indexOf("SUGGESTIONS:");
        if (suggestionsIdx != -1) {
            reply = text.substring(0, suggestionsIdx).trim();
            String rawSuggestions = text.substring(suggestionsIdx + "SUGGESTIONS:".length()).trim();
            for (String line : rawSuggestions.split("\n")) {
                line = line.trim();
                if (line.startsWith("-") || line.startsWith("•") || line.startsWith("*")) {
                    String clean = line.replaceFirst("^[-•*]\\s*", "").trim();
                    if (!clean.isEmpty()) {
                        suggestions.add(clean);
                    }
                }
            }
        }

        if (suggestions.isEmpty()) {
            suggestions = List.of(
                    "Best circuit for a 1-day trip?",
                    "What are the attraction timings?",
                    "How does the QR circuit pass work?"
            );
        }

        return new AssistantResult(reply, suggestions);
    }

    private static class AssistantResult {
        final String reply;
        final List<String> suggestions;

        AssistantResult(String reply, List<String> suggestions) {
            this.reply = reply;
            this.suggestions = suggestions;
        }
    }
}

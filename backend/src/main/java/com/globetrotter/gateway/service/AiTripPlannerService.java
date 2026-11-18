package com.globetrotter.gateway.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.globetrotter.gateway.model.Place;
import com.globetrotter.gateway.payload.TripPlanRequest;
import com.globetrotter.gateway.repository.PlaceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Intelligent AI Trip Planning Service.
 *
 * Coordinates:
 * 1. Database Ground-Truth: Official operating hours, breaks, dwell times, and terrain tips.
 * 2. OSRM Road Graph: Exact point-to-point road distance & driving duration matrix.
 * 3. Multi-Model Cloud AI with 5-Minute Circuit Breaker: Google Gemini / Groq Qwen / GPT-OSS.
 * 4. Deterministic Constraint Fallback: If cloud models are unavailable, runs an offline
 *    time-window solver respecting actual gate hours and road metrics.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiTripPlannerService {

    private final PlaceRepository placeRepository;
    private final AiModelRouterService aiModelRouterService;
    private final ObjectMapper objectMapper;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(4))
            .build();

    public JsonNode planTrip(TripPlanRequest request) {
        // 1. Resolve Target Places from Database / Payload
        List<Place> places = resolvePlaces(request);
        if (places.isEmpty()) {
            return createEmptyResponse("No valid tourist attractions selected for trip planning.");
        }

        // 2. Fetch Real Road Distance & Duration Matrix from OSRM
        double[][] roadDistancesKm = new double[places.size()][places.size()];
        int[][] drivingMinutes = new int[places.size()][places.size()];
        populateRoadMatrix(places, roadDistancesKm, drivingMinutes);

        // 3. Build Detailed Ground-Truth Prompt for Cloud AI
        String systemPrompt = buildSystemPrompt(request);
        String userPrompt = buildUserPrompt(places, request, roadDistancesKm, drivingMinutes);

        // 4. Invoke Multi-Model Cloud AI Router (Gemini -> Groq -> Circuit Breaker)
        String jsonOutput = aiModelRouterService.generateStructuredJson(systemPrompt, userPrompt);
        if (jsonOutput != null && !jsonOutput.isBlank()) {
            try {
                // Remove potential markdown code fences from LLM output
                String clean = jsonOutput.trim();
                if (clean.startsWith("```json")) {
                    clean = clean.substring(7);
                } else if (clean.startsWith("```")) {
                    clean = clean.substring(3);
                }
                if (clean.endsWith("```")) {
                    clean = clean.substring(0, clean.length() - 3);
                }
                clean = clean.trim();

                JsonNode parsed = objectMapper.readTree(clean);
                if (parsed.has("days") && parsed.path("days").isArray()) {
                    // Spot Conservation Verification: Ensure LLM did not drop candidate spots!
                    Set<String> scheduledSpots = new HashSet<>();
                    for (JsonNode dayNode : parsed.path("days")) {
                        JsonNode stopsArr = dayNode.has("stops") ? dayNode.path("stops") : dayNode.path("legs");
                        if (stopsArr.isArray()) {
                            for (JsonNode sNode : stopsArr) {
                                String name = sNode.has("name") ? sNode.path("name").asText() : sNode.path("spotName").asText("");
                                if (!name.isBlank() && !sNode.path("isMealHalt").asBoolean(false)) {
                                    for (Place p : places) {
                                        if (name.equalsIgnoreCase(p.getName())
                                                || name.toLowerCase().contains(p.getName().toLowerCase())
                                                || p.getName().toLowerCase().contains(name.toLowerCase())) {
                                            scheduledSpots.add(p.getName());
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // If LLM dropped destinations, fall back to deterministic solver to preserve 100% spots
                    if (scheduledSpots.size() < places.size()) {
                        log.warn("Cloud AI output omitted destinations (scheduled {} of {}). Falling back to deterministic topographical solver to ensure 100% attraction inclusion.",
                                scheduledSpots.size(), places.size());
                    } else {
                        log.info("Successfully generated AI trip plan using cloud intelligence with 100% spot conservation.");
                        if (parsed.isObject()) {
                            ObjectNode obj = (ObjectNode) parsed;
                            obj.put("success", true);
                            if (!obj.has("modelUsed")) {
                                String routerModel = aiModelRouterService.getLastModelUsed();
                                obj.put("modelUsed", (routerModel != null && !routerModel.isBlank() && !routerModel.equalsIgnoreCase("None"))
                                        ? routerModel : "Google Gemini 3.5 Flash Lite");
                            }
                            if (!obj.has("itinerary")) {
                                obj.set("itinerary", obj.get("days"));
                            }
                            for (JsonNode dayNode : obj.path("days")) {
                                if (dayNode.isObject()) {
                                    ObjectNode d = (ObjectNode) dayNode;
                                    if (!d.has("stops") && d.has("legs")) {
                                        d.set("stops", d.get("legs"));
                                    } else if (!d.has("legs") && d.has("stops")) {
                                        d.set("legs", d.get("stops"));
                                    }
                                    JsonNode stopsArr = d.path("stops");
                                    if (stopsArr.isArray()) {
                                        for (JsonNode sNode : stopsArr) {
                                            if (sNode.isObject()) {
                                                ObjectNode s = (ObjectNode) sNode;
                                                if (!s.has("name") && s.has("spotName")) {
                                                    s.put("name", s.path("spotName").asText());
                                                } else if (!s.has("spotName") && s.has("name")) {
                                                    s.put("spotName", s.path("name").asText());
                                                }
                                                String sName = s.has("name") ? s.path("name").asText() : "";
                                                places.stream().filter(pl -> pl.getName().equalsIgnoreCase(sName)).findFirst().ifPresent(pl -> {
                                                    if (pl.getLatitude() != null && !s.has("latitude")) s.put("latitude", pl.getLatitude());
                                                    if (pl.getLongitude() != null && !s.has("longitude")) s.put("longitude", pl.getLongitude());
                                                    if (pl.getImageUrl() != null && !s.has("imageUrl")) s.put("imageUrl", pl.getImageUrl());
                                                    if (pl.getIndividualPrice() != null && !s.has("individualPrice")) s.put("individualPrice", pl.getIndividualPrice());
                                                    if (pl.getFeesDescription() != null && !s.has("feesDescription")) s.put("feesDescription", pl.getFeesDescription());
                                                    if (pl.getCulinarySpecialty() != null && !s.has("foodTip")) s.put("foodTip", pl.getCulinarySpecialty());
                                                    if (pl.getEmergencyMedicalDistance() != null && !s.has("emergencyMedicalDistance")) s.put("emergencyMedicalDistance", pl.getEmergencyMedicalDistance());
                                                });
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        return parsed;
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to parse LLM structured JSON output: {}. Triggering algorithmic fallback.", e.getMessage());
            }
        }

        // 5. Algorithmic Fallback Solver (Deterministic Topographical Corridor Solver, 100% Inclusion)
        log.info("Executing deterministic topographical corridor solver for trip plan.");
        return buildDeterministicPlan(places, request, roadDistancesKm, drivingMinutes);
    }

    private List<Place> resolvePlaces(TripPlanRequest request) {
        List<Place> allActive = placeRepository.findByActiveTrue();
        List<Place> list = new ArrayList<>();

        // 1. If explicit IDs provided
        if (request.getPlaceIds() != null && !request.getPlaceIds().isEmpty()) {
            list.addAll(placeRepository.findAllById(request.getPlaceIds()));
            if (!list.isEmpty()) return list;
        }

        // 2. If places array (rich maps from client) provided
        if (request.getPlaces() != null && !request.getPlaces().isEmpty()) {
            for (Map<String, Object> pMap : request.getPlaces()) {
                String name = (String) pMap.get("name");
                if (name == null || name.isBlank()) continue;
                String cleanName = name.toLowerCase().trim();

                Optional<Place> match = findMatchingPlace(cleanName, allActive);
                if (match.isPresent()) {
                    Place p = match.get();
                    // Preserve and supplement with client-passed verified values
                    if (p.getLatitude() == null && pMap.get("latitude") instanceof Number) {
                        p.setLatitude(((Number) pMap.get("latitude")).doubleValue());
                    }
                    if (p.getLongitude() == null && pMap.get("longitude") instanceof Number) {
                        p.setLongitude(((Number) pMap.get("longitude")).doubleValue());
                    }
                    if (p.getElevationMeters() == null && pMap.get("elevationMeters") instanceof Number) {
                        p.setElevationMeters(((Number) pMap.get("elevationMeters")).intValue());
                    }
                    if (pMap.get("individualPrice") instanceof Number) {
                        p.setIndividualPrice(BigDecimal.valueOf(((Number) pMap.get("individualPrice")).doubleValue()));
                    }
                    if (pMap.get("feesDescription") instanceof String) {
                        p.setFeesDescription((String) pMap.get("feesDescription"));
                    }
                    if (pMap.get("culinarySpecialty") instanceof String) {
                        p.setCulinarySpecialty((String) pMap.get("culinarySpecialty"));
                    }
                    list.add(p);
                } else {
                    // Create standalone Place entity from client map so no spot is ever dropped
                    Place p = new Place();
                    p.setName(name);
                    p.setDistrict((String) pMap.getOrDefault("district", "Regional"));
                    p.setCategory((String) pMap.getOrDefault("category", "Heritage"));
                    p.setOpeningTime((String) pMap.getOrDefault("openingTime", "09:00 AM"));
                    p.setClosingTime((String) pMap.getOrDefault("closingTime", "06:00 PM"));
                    Object lat = pMap.get("latitude");
                    Object lng = pMap.get("longitude");
                    if (lat instanceof Number) p.setLatitude(((Number) lat).doubleValue());
                    if (lng instanceof Number) p.setLongitude(((Number) lng).doubleValue());
                    Object elev = pMap.get("elevationMeters");
                    if (elev instanceof Number) p.setElevationMeters(((Number) elev).intValue());
                    Object price = pMap.get("individualPrice");
                    if (price instanceof Number) p.setIndividualPrice(BigDecimal.valueOf(((Number) price).doubleValue()));
                    p.setFeesDescription((String) pMap.get("feesDescription"));
                    p.setCulinarySpecialty((String) pMap.get("culinarySpecialty"));
                    p.setEmergencyMedicalDistance((String) pMap.get("emergencyMedicalDistance"));
                    p.setCheckpostCurfew((String) pMap.get("checkpostCurfew"));
                    list.add(p);
                }
            }
            if (!list.isEmpty()) return list;
        }

        // 3. Fallback: placeNames
        if (request.getPlaceNames() != null && !request.getPlaceNames().isEmpty()) {
            for (String name : request.getPlaceNames()) {
                if (name == null || name.isBlank()) continue;
                String cleanName = name.toLowerCase().trim();
                Optional<Place> match = findMatchingPlace(cleanName, allActive);
                if (match.isPresent()) {
                    list.add(match.get());
                } else {
                    Place p = new Place();
                    p.setName(name);
                    p.setDistrict("Regional");
                    p.setCategory("Heritage");
                    p.setOpeningTime("09:00 AM");
                    p.setClosingTime("06:00 PM");
                    list.add(p);
                }
            }
        }

        return list;
    }

    private Optional<Place> findMatchingPlace(String searchName, List<Place> allActive) {
        // Direct exact or bidirectional substring match
        Optional<Place> exact = allActive.stream()
                .filter(p -> {
                    String dbName = p.getName().toLowerCase();
                    return dbName.equals(searchName) || dbName.contains(searchName) || searchName.contains(dbName);
                })
                .findFirst();
        if (exact.isPresent()) return exact;

        // Clean common noise words and match tokens
        String stripped = searchName.replaceAll("(?i)(district|museum|temple|beach|caves|park|waterfalls|hills|viewpoint|center|centre|nature camp|botanical gardens)", "").trim();
        if (!stripped.isBlank() && stripped.length() >= 4) {
            return allActive.stream()
                    .filter(p -> {
                        String dbName = p.getName().toLowerCase();
                        return dbName.contains(stripped) || stripped.contains(dbName);
                    })
                    .findFirst();
        }
        return Optional.empty();
    }

    private void populateRoadMatrix(List<Place> places, double[][] dists, int[][] durations) {
        int n = places.size();
        if (n <= 1) {
            return;
        }

        // Try calling OSRM Table API
        boolean osrmSuccess = false;
        try {
            StringBuilder coords = new StringBuilder();
            for (int i = 0; i < n; i++) {
                Place p = places.get(i);
                double lng = p.getLongitude() != null ? p.getLongitude() : 83.2185;
                double lat = p.getLatitude() != null ? p.getLatitude() : 17.6868;
                if (i > 0) coords.append(";");
                coords.append(lng).append(",").append(lat);
            }

            String osrmUrl = "https://router.project-osrm.org/table/v1/driving/"
                    + coords + "?annotations=distance,duration";

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(osrmUrl))
                    .header("User-Agent", "Globetrotter/1.0")
                    .timeout(Duration.ofSeconds(4))
                    .GET()
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (resp.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(resp.body());
                JsonNode dArr = root.path("distances");
                JsonNode tArr = root.path("durations");

                for (int i = 0; i < n; i++) {
                    for (int j = 0; j < n; j++) {
                        if (i == j) {
                            dists[i][j] = 0.0;
                            durations[i][j] = 0;
                            continue;
                        }
                        double dMeters = dArr.get(i).get(j).asDouble(0.0);
                        double tSecs = tArr.get(i).get(j).asDouble(0.0);
                        double km = Math.round((dMeters / 1000.0) * 10.0) / 10.0;
                        int mins = (int) Math.round(tSecs / 60.0);

                        // Adjacent spots check (e.g. Tribal Museum & Coffee Museum)
                        String n1 = places.get(i).getName().toLowerCase();
                        String n2 = places.get(j).getName().toLowerCase();
                        if ((n1.contains("tribal museum") && n2.contains("coffee museum")) ||
                            (n1.contains("coffee museum") && n2.contains("tribal museum")) || km < 0.6) {
                            km = 0.5;
                            mins = 8;
                        } else {
                            mins += 10; // realistic parking & check-in buffer
                        }
                        dists[i][j] = km;
                        durations[i][j] = mins;
                    }
                }
                log.info("OSRM road matrix successfully populated for {} spots.", n);
                osrmSuccess = true;
            }
        } catch (Exception e) {
            log.warn("OSRM table lookup failed ({}). Calculating terrain-aware road estimates.", e.getMessage());
        }

        if (!osrmSuccess) {
            for (int i = 0; i < n; i++) {
                for (int j = 0; j < n; j++) {
                    if (i == j) {
                        dists[i][j] = 0.0;
                        durations[i][j] = 0;
                    } else {
                        Place p1 = places.get(i);
                        Place p2 = places.get(j);
                        String n1 = p1.getName().toLowerCase();
                        String n2 = p2.getName().toLowerCase();

                        // Adjacent walking transfer
                        if ((n1.contains("tribal museum") && n2.contains("coffee museum")) ||
                            (n1.contains("coffee museum") && n2.contains("tribal museum"))) {
                            dists[i][j] = 0.5;
                            durations[i][j] = 8;
                            continue;
                        }

                        double airKm = haversine(p1.getLatitude(), p1.getLongitude(), p2.getLatitude(), p2.getLongitude());
                        double roadKm = Math.max(2.5, Math.round(airKm * 1.45 * 10.0) / 10.0);
                        dists[i][j] = roadKm;

                        int e1 = p1.getElevationMeters() != null ? p1.getElevationMeters() : 100;
                        int e2 = p2.getElevationMeters() != null ? p2.getElevationMeters() : 100;
                        int elevDelta = Math.abs(e1 - e2);

                        // Ghat roads (24 km/h) vs standard highway (45 km/h)
                        double speed = (elevDelta >= 400 || e1 > 600 || e2 > 600) ? 24.0 : 45.0;
                        int driveMins = (int) Math.round((roadKm / speed) * 60) + 12;
                        durations[i][j] = driveMins;
                    }
                }
            }
        }
    }

    private double haversine(Double lat1, Double lon1, Double lat2, Double lon2) {
        if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 15.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return 6371.0 * c;
    }

    private String buildSystemPrompt(TripPlanRequest request) {
        String lang = request.getLanguage() != null ? request.getLanguage() : "en";
        String langInst = lang.equalsIgnoreCase("te") ? "Respond with Telugu summaries while keeping place names readable."
                : lang.equalsIgnoreCase("hi") ? "Respond with Hindi summaries while keeping place names readable."
                : "Respond in clear English with concise, practical notes.";

        return "You are Globetrotter's AI Travel Guide & Tour Planner for Andhra Pradesh and Telangana.\n"
                + "You construct precise, feasible, day-by-day tour plans for Indian tourists and families based on actual road driving times and gate hours.\n"
                + "STRICT RULES:\n"
                + "1. MANDATORY 100% ATTRACTION RETENTION: You MUST include EVERY SINGLE ONE of the requested candidate attractions across the scheduled days. Dropping or omitting any attraction is strictly forbidden.\n"
                + "2. TOPOGRAPHICAL CORRIDOR ORDER: Arrange stops along natural elevation descent/ascent to avoid dangerous night driving on winding ghat hairpins. Dawn viewpoints (e.g., Vanjangi Cloud Hills) MUST be scheduled at 05:30 AM sunrise. Monuments with early closing curfews (Borra Caves, Dolphin's Nose Lighthouse) MUST be scheduled before 05:00 PM closing.\n"
                + "3. MANDATORY LUNCH BREAK: Include a 45-minute regional culinary halt between 12:30 PM and 02:00 PM on each day.\n"
                + "4. ADJACENT VENUES: Venues in the same town (e.g., Araku Tribal Museum and Coffee Museum) are walking distance (8 mins transfer).\n"
                + "5. REALISTIC MOUNTAIN TRANSIT: Hairpin mountain descents take average 24 km/h.\n"
                + "6. DYNAMIC DURATION ALLOCATION: Evaluate total driving hours and dwell times to determine the ideal number of days. Comfortably distribute 2 to 4 attractions per day so travelers avoid fatigue and curfews.\n"
                + "7. " + langInst + "\n"
                + "8. Output strictly valid JSON conforming to this schema:\n"
                + "{\n"
                + "  \"summary\": \"Brief strategic rationale of the route sequence\",\n"
                + "  \"totalRoadKm\": 120.5,\n"
                + "  \"totalDriveHours\": \"4.5 hrs\",\n"
                + "  \"days\": [\n"
                + "    {\n"
                + "      \"dayNumber\": 1,\n"
                + "      \"date\": \"YYYY-MM-DD\",\n"
                + "      \"theme\": \"Day Title / Region\",\n"
                + "      \"legs\": [\n"
                + "        {\n"
                + "          \"spotName\": \"Attraction Name\",\n"
                + "          \"district\": \"District Name\",\n"
                + "          \"arrivalTime\": \"10:15 AM\",\n"
                + "          \"departureTime\": \"12:00 PM\",\n"
                + "          \"dwellMinutes\": 105,\n"
                + "          \"individualPrice\": 110,\n"
                + "          \"feesDescription\": \"₹110 Entry Fee\",\n"
                + "          \"roadDistanceKmFromPrev\": 48.0,\n"
                + "          \"driveMinutesFromPrev\": 47,\n"
                + "          \"transitLegDesc\": \"48.0 km drive (47 mins via SH-39)\",\n"
                + "          \"foodTip\": \"Bamboo chicken or regional specialty\",\n"
                + "          \"notes\": \"Practical tip on tickets, photography or parking\"\n"
                + "        }\n"
                + "      ]\n"
                + "    }\n"
                + "  ],\n"
                + "  \"travelAdvice\": [\n"
                + "    \"Key driving caution or gate tip\",\n"
                + "    \"Local culinary specialty to try on route\"\n"
                + "  ]\n"
                + "}";
    }

    private String buildUserPrompt(List<Place> places, TripPlanRequest request, double[][] dists, int[][] durations) {
        StringBuilder sb = new StringBuilder();
        sb.append("TRIP SPECIFICATIONS:\n");
        sb.append("- Start Date: ").append(request.getStartDate() != null ? request.getStartDate() : "Today").append("\n");
        sb.append("- Preferred Departure Time: ").append(request.getStartTime() != null ? request.getStartTime() : "09:00 AM").append("\n");
        sb.append("- Party Type: ").append(request.getPartyType() != null ? request.getPartyType() : "Family with Kids").append("\n");
        sb.append("- Travel Pace: ").append(request.getPace() != null ? request.getPace() : "Balanced").append("\n");
        if (request.getDays() != null && !Boolean.TRUE.equals(request.getAutoCalculateDays())) {
            sb.append("- Desired Duration: ").append(request.getDays()).append(" days\n\n");
        } else {
            sb.append("- Desired Duration: AUTO-CALCULATE (Analyze the chosen attractions, opening hours, dwell times, and road transit to automatically determine the optimal number of days so travelers have an enjoyable, unhurried journey).\n\n");
        }

        sb.append("CANDIDATE ATTRACTIONS (WITH GROUND TRUTH DETAILS):\n");
        for (int i = 0; i < places.size(); i++) {
            Place p = places.get(i);
            sb.append("[").append(i + 1).append("] ").append(p.getName()).append("\n");
            sb.append("    District: ").append(p.getDistrict() != null ? p.getDistrict() : p.getCity()).append("\n");
            sb.append("    Official Hours: ").append(p.getOpeningTime() != null ? p.getOpeningTime() : "08:30 AM")
                    .append(" to ").append(p.getClosingTime() != null ? p.getClosingTime() : "06:00 PM").append("\n");
            if (p.getBestVisitingHoursStart() != null) {
                sb.append("    Best Visiting Window: ").append(p.getBestVisitingHoursStart())
                        .append(" - ").append(p.getBestVisitingHoursEnd()).append("\n");
            }
            if (p.getScenicTip() != null) {
                sb.append("    Scenic Tip: ").append(p.getScenicTip()).append("\n");
            }
            if (p.getPhysicalDifficulty() != null) {
                sb.append("    Difficulty: ").append(p.getPhysicalDifficulty()).append("\n");
            }
            if (p.getIndividualPrice() != null) {
                sb.append("    Official Entry Ticket: ₹").append(p.getIndividualPrice()).append("\n");
            }
            if (p.getFeesDescription() != null) {
                sb.append("    Fees Breakdown: ").append(p.getFeesDescription()).append("\n");
            }
            if (p.getCulinarySpecialty() != null) {
                sb.append("    Culinary Specialty: ").append(p.getCulinarySpecialty()).append("\n");
            }
        }

        sb.append("\nOSRM ROAD DISTANCE & DRIVE DURATION MATRIX:\n");
        for (int i = 0; i < places.size(); i++) {
            for (int j = i + 1; j < places.size(); j++) {
                sb.append("• ").append(places.get(i).getName()).append(" ➔ ").append(places.get(j).getName())
                        .append(": ").append(dists[i][j]).append(" km (").append(durations[i][j]).append(" mins drive)\n");
            }
        }

        sb.append("\nPlease order the stops optimally along the natural corridor gradient, include all places, respect operating hours, and generate the final JSON tour plan.");
        return sb.toString();
    }

    private JsonNode buildDeterministicPlan(List<Place> places, TripPlanRequest request, double[][] dists, int[][] durations) {
        ObjectNode root = objectMapper.createObjectNode();
        root.put("success", true);
        root.put("modelUsed", "Spring Boot Topographical Corridor Engine (OSRM + Ground Truth)");

        int n = places.size();

        // 1. Topographical Corridor Sort:
        // Vanjangi sunrise spot first -> Descending elevation gradient (High plateau -> Mid ghats -> Coastal plains)
        List<Place> orderedPlaces = new ArrayList<>(places);
        orderedPlaces.sort((a, b) -> {
            String na = (a.getName() != null) ? a.getName().toLowerCase() : "";
            String nb = (b.getName() != null) ? b.getName().toLowerCase() : "";
            if (na.contains("vanjangi") || na.contains("sunrise")) return -1;
            if (nb.contains("vanjangi") || nb.contains("sunrise")) return 1;
            int ea = a.getElevationMeters() != null ? a.getElevationMeters() : 100;
            int eb = b.getElevationMeters() != null ? b.getElevationMeters() : 100;
            return Integer.compare(eb, ea); // High to low elevation
        });

        int minElev = orderedPlaces.stream().mapToInt(p -> p.getElevationMeters() != null ? p.getElevationMeters() : 100).min().orElse(100);
        int maxElev = orderedPlaces.stream().mapToInt(p -> p.getElevationMeters() != null ? p.getElevationMeters() : 100).max().orElse(100);
        int elevationSpan = maxElev - minElev;
        boolean isMountainCorridor = elevationSpan >= 500 || orderedPlaces.stream().anyMatch(p -> p.getDistrict() != null && p.getDistrict().toLowerCase().contains("alluri"));

        // 2. Intelligent & Safe Days Partitioning:
        // Mountain corridors with steep elevation changes cap at 3-4 attractions per day
        int maxSafeSpotsPerDay = isMountainCorridor ? 3 : 4;
        int minSafeDays = Math.max(1, (int) Math.ceil((double) n / (double) maxSafeSpotsPerDay));

        int targetDays;
        boolean daysAdjustedForSafety = false;
        String safetyNotice = null;

        if (request.getDays() == null || request.getDays() <= 0) {
            targetDays = minSafeDays;
        } else {
            targetDays = request.getDays();
            if (targetDays < minSafeDays) {
                daysAdjustedForSafety = true;
                safetyNotice = "Your " + n + " destinations span " + elevationSpan + "m elevation change. Structured across " + minSafeDays + " days to ensure arrival during open monument hours (e.g. caves & lighthouse before 5:00 PM) and safe daylight mountain driving.";
                targetDays = minSafeDays;
            }
        }

        root.put("totalDays", targetDays);
        root.put("calculatedDays", targetDays);
        root.put("daysAdjustedForSafety", daysAdjustedForSafety);
        if (safetyNotice != null) {
            root.put("safetyNotice", safetyNotice);
        }

        // 3. Partition spots across targetDays buckets without dropping a single destination
        List<List<Place>> dayBuckets = new ArrayList<>();
        int baseCount = Math.floorDiv(n, targetDays);
        int remainder = n % targetDays;
        int curIdx = 0;
        for (int d = 0; d < targetDays; d++) {
            int countForDay = baseCount + (d < remainder ? 1 : 0);
            int endIdx = Math.min(n, curIdx + countForDay);
            dayBuckets.add(new ArrayList<>(orderedPlaces.subList(curIdx, endIdx)));
            curIdx = endIdx;
        }

        ArrayNode daysNode = root.putArray("days");
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("hh:mm a", Locale.ENGLISH);

        double totalTripKm = 0.0;
        int totalMinutes = 0;

        for (int dayIdx = 0; dayIdx < targetDays; dayIdx++) {
            int dayNumber = dayIdx + 1;
            List<Place> daySpots = dayBuckets.get(dayIdx);
            if (daySpots.isEmpty()) continue;

            ObjectNode dayNode = daysNode.addObject();
            dayNode.put("dayNumber", dayNumber);
            dayNode.put("day", dayNumber);

            Place firstPlaceOfDay = daySpots.get(0);
            String dayDistrict = firstPlaceOfDay.getDistrict() != null ? firstPlaceOfDay.getDistrict() : "Regional";
            dayNode.put("theme", "Day " + dayNumber + ": " + dayDistrict + " Corridor Exploration");
            dayNode.put("title", "Day " + dayNumber + ": " + dayDistrict + " Highlights");

            ArrayNode legsNode = dayNode.putArray("legs");
            ArrayNode stopsNode = dayNode.putArray("stops");

            // Check if day begins with a dawn / sunrise spot (Vanjangi)
            boolean hasSunriseSpot = daySpots.stream().anyMatch(p -> {
                String pname = (p.getName() != null) ? p.getName().toLowerCase() : "";
                return pname.contains("vanjangi") || pname.contains("sunrise");
            });

            LocalTime current = hasSunriseSpot ? LocalTime.of(5, 30) : LocalTime.of(9, 0);
            double dayKm = 0.0;
            int dayDriveMins = 0;
            boolean hadLunch = false;

            for (int spotIdx = 0; spotIdx < daySpots.size(); spotIdx++) {
                Place spot = daySpots.get(spotIdx);

                // Leg transit from previous spot
                double legDist = 0.0;
                int legDrive = 0;

                if (spotIdx > 0) {
                    Place prev = daySpots.get(spotIdx - 1);
                    String n1 = prev.getName() != null ? prev.getName().toLowerCase() : "";
                    String n2 = spot.getName() != null ? spot.getName().toLowerCase() : "";

                    // Adjacent walking transfer
                    if ((n1.contains("tribal museum") && n2.contains("coffee museum")) ||
                        (n1.contains("coffee museum") && n2.contains("tribal museum"))) {
                        legDist = 0.5;
                        legDrive = 8;
                    } else {
                        double air = haversine(prev.getLatitude(), prev.getLongitude(), spot.getLatitude(), spot.getLongitude());
                        legDist = Math.max(2.5, Math.round(air * 1.45 * 10.0) / 10.0);
                        int e1 = prev.getElevationMeters() != null ? prev.getElevationMeters() : 100;
                        int e2 = spot.getElevationMeters() != null ? spot.getElevationMeters() : 100;
                        double speed = (Math.abs(e1 - e2) >= 400 || e1 > 600 || e2 > 600) ? 24.0 : 45.0;
                        legDrive = (int) Math.round((legDist / speed) * 60) + 12;
                    }

                    dayKm += legDist;
                    dayDriveMins += legDrive;
                    current = current.plusMinutes(legDrive);
                }

                // Mandatory Lunch Break Injection (between 12:30 PM and 02:30 PM)
                if (!hadLunch && current.isAfter(LocalTime.of(12, 30)) && current.isBefore(LocalTime.of(14, 30))) {
                    hadLunch = true;
                    ObjectNode lunchStop = objectMapper.createObjectNode();
                    lunchStop.put("name", "Regional Culinary Halt • " + (spot.getDistrict() != null ? spot.getDistrict() : "Corridor"));
                    lunchStop.put("spotName", "Regional Culinary Halt • " + (spot.getDistrict() != null ? spot.getDistrict() : "Corridor"));
                    lunchStop.put("district", spot.getDistrict() != null ? spot.getDistrict() : "Regional");
                    lunchStop.put("category", "Dining & Rest");
                    lunchStop.put("timings", "12:30 PM – 03:00 PM");
                    lunchStop.put("arrivalTime", current.format(timeFmt));
                    current = current.plusMinutes(45);
                    lunchStop.put("departureTime", current.format(timeFmt));
                    lunchStop.put("dwellMinutes", 45);
                    lunchStop.putNull("individualPrice");
                    lunchStop.put("feesDescription", "À la carte dining");
                    lunchStop.put("foodTip", spot.getCulinarySpecialty() != null ? spot.getCulinarySpecialty()
                            : "Authentic regional South Indian thali, bamboo chicken & fresh snacks.");
                    lunchStop.put("isMealHalt", true);
                    if (spot.getLatitude() != null) lunchStop.put("latitude", spot.getLatitude());
                    if (spot.getLongitude() != null) lunchStop.put("longitude", spot.getLongitude());

                    legsNode.add(lunchStop);
                    stopsNode.add(lunchStop);
                }

                ObjectNode stopObj = objectMapper.createObjectNode();
                stopObj.put("name", spot.getName());
                stopObj.put("spotName", spot.getName());
                stopObj.put("district", spot.getDistrict() != null ? spot.getDistrict() : spot.getCity());
                stopObj.put("category", spot.getCategory() != null ? spot.getCategory() : "Heritage");
                String timingStr = (spot.getOpeningTime() != null && spot.getClosingTime() != null)
                        ? spot.getOpeningTime() + " – " + spot.getClosingTime() : "09:00 AM – 06:00 PM";
                stopObj.put("timings", timingStr);
                if (spot.getLatitude() != null) stopObj.put("latitude", spot.getLatitude());
                if (spot.getLongitude() != null) stopObj.put("longitude", spot.getLongitude());
                if (spot.getImageUrl() != null) stopObj.put("imageUrl", spot.getImageUrl());

                // Ground Reality Attributes
                if (spot.getIndividualPrice() != null) {
                    stopObj.put("individualPrice", spot.getIndividualPrice());
                } else {
                    stopObj.putNull("individualPrice");
                }
                stopObj.put("feesDescription", spot.getFeesDescription() != null ? spot.getFeesDescription()
                        : (spot.getIndividualPrice() != null ? "₹" + spot.getIndividualPrice() + " per person" : "Free Public Access"));
                stopObj.put("foodTip", spot.getCulinarySpecialty() != null ? spot.getCulinarySpecialty()
                        : "Authentic regional South Indian thali and seasonal snacks.");
                stopObj.put("authenticPurchases", spot.getAuthenticPurchases() != null ? spot.getAuthenticPurchases()
                        : "Regional handicrafts and certified GI items.");
                stopObj.put("emergencyMedicalDistance", spot.getEmergencyMedicalDistance() != null ? spot.getEmergencyMedicalDistance()
                        : "Government Hospital within 15 km.");
                stopObj.put("checkpostCurfew", spot.getCheckpostCurfew() != null ? spot.getCheckpostCurfew()
                        : "Daylight road access.");

                stopObj.put("arrivalTime", current.format(timeFmt));

                String spotCat = spot.getCategory() != null ? spot.getCategory().toLowerCase() : "";
                String sNameLower = spot.getName() != null ? spot.getName().toLowerCase() : "";
                int dwell = sNameLower.contains("borra") ? 120
                        : sNameLower.contains("katiki") ? 105
                        : sNameLower.contains("vanjangi") ? 90
                        : spotCat.contains("cave") ? 120
                        : spotCat.contains("waterfall") ? 105
                        : spotCat.contains("museum") ? 60
                        : spotCat.contains("temple") ? 75
                        : spotCat.contains("garden") ? 75 : 60;
                stopObj.put("dwellMinutes", dwell);

                current = current.plusMinutes(dwell);
                stopObj.put("departureTime", current.format(timeFmt));
                stopObj.put("roadDistanceKmFromPrev", legDist);
                stopObj.put("driveMinutesFromPrev", legDrive);
                stopObj.put("notes", spot.getScenicTip() != null ? spot.getScenicTip() : "Verified landmark. Carry water and comfortable footwear.");

                legsNode.add(stopObj);
                stopsNode.add(stopObj);
            }

            // Inter-day transit from previous day's last stop
            if (dayIdx > 0 && !dayBuckets.get(dayIdx - 1).isEmpty()) {
                Place prevDayLast = dayBuckets.get(dayIdx - 1).get(dayBuckets.get(dayIdx - 1).size() - 1);
                Place todayFirst = daySpots.get(0);
                double interAir = haversine(prevDayLast.getLatitude(), prevDayLast.getLongitude(), todayFirst.getLatitude(), todayFirst.getLongitude());
                double interKm = Math.max(8.0, Math.round(interAir * 1.35 * 10.0) / 10.0);
                dayKm += interKm;
            }

            double roundedDayKm = Math.round(dayKm * 10.0) / 10.0;
            totalTripKm += roundedDayKm;
            totalMinutes += dayDriveMins;

            dayNode.put("estimatedDistance", roundedDayKm + " km");
            dayNode.put("dayKm", roundedDayKm);
            dayNode.put("estimatedDuration", (dayDriveMins / 60) + "h " + (dayDriveMins % 60) + "m");
            dayNode.put("summary", "Coordinated " + daySpots.size() + " scenic stops in " + dayDistrict + ".");
            dayNode.put("curfewAdvisory", daySpots.stream().anyMatch(p -> (p.getCheckpostCurfew() != null && p.getCheckpostCurfew().toLowerCase().contains("curfew")))
                    ? "Ghat road and forest checkpoints close at dusk. Plan descent before 07:00 PM."
                    : "Daytime transit safe. Plan arrival at overnight halt before 08:00 PM on ghat stretches.");
        }

        double finalTotalKm = Math.round(totalTripKm * 10.0) / 10.0;
        root.set("days", daysNode);
        root.set("itinerary", daysNode);
        root.put("totalRoadKm", finalTotalKm);
        root.put("totalDriveHours", (totalMinutes / 60) + "h " + (totalMinutes % 60) + "m");
        root.put("summary", safetyNotice != null
                ? "Optimized " + n + " attractions across " + targetDays + " days for family comfort and gate safety."
                : "Sequenced " + n + " attractions across " + targetDays + " days along the natural corridor gradient.");

        ArrayNode advice = root.putArray("travelAdvice");
        advice.add("Drive with headlights on low beam on ghat road curves.");
        advice.add("Keep digital ticket passes downloaded offline for areas with low mobile reception.");
        advice.add("Taste authentic hot bamboo chicken in Araku Valley and freshly ground hill coffee.");

        return root;
    }

    private JsonNode createEmptyResponse(String msg) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("summary", msg);
        node.putArray("days");
        node.put("totalRoadKm", 0.0);
        return node;
    }
}

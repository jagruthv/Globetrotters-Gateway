package com.globetrotter.gateway.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.globetrotter.gateway.model.CircuitPlace;
import com.globetrotter.gateway.model.Place;
import com.globetrotter.gateway.repository.CircuitPlaceRepository;
import com.globetrotter.gateway.repository.PlaceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.math.BigDecimal;
import java.util.*;

@Component
@Order(1)
@RequiredArgsConstructor
@Slf4j
public class AtlasDataSeeder implements CommandLineRunner {

    private final PlaceRepository placeRepository;
    private final CircuitPlaceRepository circuitPlaceRepository;
    private final ObjectMapper objectMapper;

    private static final Map<String, String> SLUG_ALIASES = Map.ofEntries(
            Map.entry("kailasagiri-hilltop", "kailasagiri-hilltop-park-ropeway"),
            Map.entry("rk-beach", "ramakrishna-rk-beach-seafront-promenade"),
            Map.entry("ins-kurusura-submarine", "ins-kurusura-submarine-museum"),
            Map.entry("tu-142-aircraft-museum", "tu-142m-aircraft-museum"),
            Map.entry("araku-coffee-museum", "araku-coffee-museum-gcc-experience-center"),
            Map.entry("padmapuram-botanical-gardens", "padmapuram-botanical-gardens-tree-top-huts"),
            Map.entry("araku-chocolate-world", "araku-chocolate-factory-homemade-chocolate-world"),
            Map.entry("chaparai-water-cascades", "chaparai-water-cascades-dumbriguda"),
            Map.entry("tyda-jungle-bells", "tyda-jungle-bells-nature-camp"),
            Map.entry("vanjangi-cloud-hills", "vanjangi-cloud-hills-meghalaya-of-ap"),
            Map.entry("lambasingi-frost-point", "lambasingi-kashmir-of-andhra-pradesh"),
            Map.entry("kapila-theertham", "kapila-theertham-mountain-waterfall-shiva-shrine"),
            Map.entry("chandragiri-fort-palace", "chandragiri-fort-raja-rani-archaeological-palaces"),
            Map.entry("silathoranam-natural-arch", "silathoranam-rare-natural-geological-rock-arch"),
            Map.entry("charminar-laad-bazaar", "charminar-laad-bazaar-lacquer-bangles"),
            Map.entry("golconda-fort", "golconda-fort-acoustic-portico-walk"),
            Map.entry("salar-jung-museum", "salar-jung-museum-world-s-largest-one-man-art-collection"),
            Map.entry("chowmahalla-palace", "chowmahalla-palace-royal-vintage-car-collection"),
            Map.entry("thousand-pillar-temple", "thousand-pillar-temple-sri-rudreshwara-swamy"),
            Map.entry("warangal-fort-kala-thoranam", "warangal-fort-kakatiya-kala-thoranam"),
            Map.entry("ramappa-temple-unesco", "ramappa-temple-sri-rudreshwara-swamy-unesco-world-heritage-site"),
            Map.entry("laknavaram-lake-bridges", "laknavaram-lake-suspension-bridges"),
            Map.entry("kuntala-waterfalls", "kuntala-waterfalls-highest-waterfall-in-telangana"),
            Map.entry("nagarjunakonda-museum", "nagarjunakonda-island-archaeological-museum"),
            Map.entry("belum-caves", "belum-caves-subterranean-karst-limestone-passages"),
            Map.entry("gandikota-grand-canyon", "gandikota-grand-canyon-of-india-historic-fort")
    );

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        log.info("Starting AtlasDataSeeder: Ingesting exhaustive Andhra Pradesh & Telangana ground-truth places...");

        ClassPathResource resource = new ClassPathResource("data/atlas_places.json");
        if (!resource.exists()) {
            log.warn("atlas_places.json not found in classpath (data/atlas_places.json). Skipping automatic atlas hydration.");
            return;
        }

        try (InputStream inputStream = resource.getInputStream()) {
            JsonNode root = objectMapper.readTree(inputStream);
            Set<Long> canonicalPlaceIds = new HashSet<>();
            int createdCount = 0;
            int updatedCount = 0;

            Map<String, Place> existingBySlug = new HashMap<>();
            Map<String, Place> existingByName = new HashMap<>();
            for (Place p : placeRepository.findAll()) {
                if (p.getSlug() != null) existingBySlug.put(p.getSlug().toLowerCase(), p);
                if (p.getName() != null) existingByName.put(p.getName().toLowerCase().trim(), p);
            }

            if (root.has("andhraPradesh")) {
                int[] counts = processDistrictArray(root.path("andhraPradesh"), "Andhra Pradesh", canonicalPlaceIds, existingBySlug, existingByName);
                createdCount += counts[0];
                updatedCount += counts[1];
            }

            if (root.has("telangana")) {
                int[] counts = processDistrictArray(root.path("telangana"), "Telangana", canonicalPlaceIds, existingBySlug, existingByName);
                createdCount += counts[0];
                updatedCount += counts[1];
            }

            // Purge any orphaned / duplicate places not present in the canonical atlas
            purgeOrphanedDuplicates(canonicalPlaceIds);

            log.info("AtlasDataSeeder completed successfully: {} new places created, {} existing places updated. Total places in repository: {}",
                    createdCount, updatedCount, placeRepository.count());
        } catch (Exception e) {
            log.error("Failed to hydrate atlas places from atlas_places.json: {}", e.getMessage(), e);
        }
    }

    private int[] processDistrictArray(JsonNode districtsNode, String defaultState, Set<Long> canonicalIds,
                                       Map<String, Place> existingBySlug, Map<String, Place> existingByName) {
        int created = 0;
        int updated = 0;
        if (!districtsNode.isArray()) return new int[]{0, 0};

        for (JsonNode distNode : districtsNode) {
            String districtName = distNode.path("name").asText("").trim();
            JsonNode spots = distNode.path("spots");
            if (!spots.isArray()) continue;

            for (JsonNode spot : spots) {
                String name = spot.path("name").asText("").trim();
                if (name.isEmpty()) continue;

                String normName = name.toLowerCase().trim();
                String slug = spot.path("slug").asText(generateSlug(name));

                Set<String> acceptableSlugs = new HashSet<>();
                acceptableSlugs.add(slug.toLowerCase());
                for (Map.Entry<String, String> entry : SLUG_ALIASES.entrySet()) {
                    if (entry.getValue().equalsIgnoreCase(slug)) {
                        acceptableSlugs.add(entry.getKey().toLowerCase());
                    }
                }

                // O(1) indexed lookup by slug or alias, falling back to normalized name
                Place targetPlace = null;
                for (String accSlug : acceptableSlugs) {
                    if (existingBySlug.containsKey(accSlug)) {
                        targetPlace = existingBySlug.get(accSlug);
                        break;
                    }
                }
                if (targetPlace == null && existingByName.containsKey(normName)) {
                    targetPlace = existingByName.get(normName);
                }

                if (targetPlace != null) {
                    updated++;
                } else {
                    targetPlace = new Place();
                    created++;
                }

                // Populate full 15-point ground-truth attributes
                populatePlaceFields(targetPlace, spot, name, slug, districtName, defaultState);
                Place saved = placeRepository.save(targetPlace);
                canonicalIds.add(saved.getId());

                if (saved.getSlug() != null) existingBySlug.put(saved.getSlug().toLowerCase(), saved);
                if (saved.getName() != null) existingByName.put(saved.getName().toLowerCase().trim(), saved);
            }
        }
        return new int[]{created, updated};
    }

    private void populatePlaceFields(Place p, JsonNode spot, String name, String slug, String districtName, String defaultState) {
        String mandal = spot.path("mandal").asText("").trim();
        p.setName(name);
        p.setSlug(slug);
        p.setState(defaultState);
        p.setDistrict(districtName);
        p.setCity(mandal.isEmpty() ? districtName : mandal);

        p.setCategory(spot.path("category").asText("Scenic & Cultural"));
        p.setDescription(spot.path("description").asText(""));
        p.setBackstory(spot.path("backstory").asText(""));
        p.setRulesAndHazards(spot.path("rules_and_hazards").asText(""));
        p.setScamsAndFakes(spot.path("scams_and_fakes").asText(""));
        p.setAuthenticPurchases(spot.path("authentic_purchases").asText(""));

        p.setOpeningTime(spot.path("openingTime").asText("08:00 AM"));
        p.setClosingTime(spot.path("closingTime").asText("06:00 PM"));
        p.setIndividualPrice(BigDecimal.valueOf(spot.path("individualPrice").asDouble(0.0)));
        p.setFeesDescription(spot.path("feesDescription").asText(""));

        int elev = spot.path("elevationMeters").asInt(parseElevation(spot.path("elevation").asText("")));
        p.setElevationMeters(elev);
        p.setPhysicalDifficulty(spot.path("physicalDifficulty").asText("MODERATE"));
        p.setDistanceText(spot.path("distanceText").asText(""));
        p.setLastMileTransitType(spot.path("lastMileTransitType").asText("Paved all-weather access road."));

        p.setGoldenHour(spot.path("goldenHour").asText(""));
        p.setBestVisitingHoursStart(spot.path("bestVisitingHoursStart").asText("06:30 AM"));
        p.setBestVisitingHoursEnd(spot.path("bestVisitingHoursEnd").asText("08:30 AM"));

        p.setAverageRating(spot.path("averageRating").asDouble(4.5));
        p.setReviewCount(spot.path("reviewCount").asInt(2500));

        if (spot.has("googlePlaceId") && !spot.path("googlePlaceId").isNull()) {
            p.setGooglePlaceId(spot.path("googlePlaceId").asText());
        }
        if (spot.has("googleMapsUri") && !spot.path("googleMapsUri").isNull()) {
            p.setGoogleMapsUri(spot.path("googleMapsUri").asText());
        }
        p.setAddress(spot.path("address").asText(""));

        p.setCellularCoverage(spot.path("cellularCoverage").asText("Jio/Airtel 4G active."));
        p.setCheckpostCurfew(spot.path("checkpostCurfew").asText("Open regular gate hours."));
        p.setSanitationFacility(spot.path("sanitationFacility").asText("Public conveniences available."));
        p.setCulinarySpecialty(spot.path("culinarySpecialty").asText("Local regional delicacies."));
        p.setEmergencyMedicalDistance(spot.path("emergencyMedicalDistance").asText("Area hospital within 5–10 km."));
        p.setTypicalDwellTime(spot.path("typicalDwellTime").asText("1.5 Hours"));

        String rawImg = spot.path("imageUrl").asText("").trim();
        if (rawImg.isEmpty() || rawImg.contains("unsplash.com") || rawImg.equalsIgnoreCase("null")) {
            p.setImageUrl(null);
        } else {
            p.setImageUrl(rawImg);
        }

        p.setActive(true);
    }

    private void relinkAndPurgeDuplicate(Place duplicate, Place canonical) {
        if (duplicate.getId() == null || canonical.getId() == null) return;
        List<CircuitPlace> circuitPlaces = circuitPlaceRepository.findByPlaceId(duplicate.getId());
        for (CircuitPlace cp : circuitPlaces) {
            cp.setPlace(canonical);
            circuitPlaceRepository.save(cp);
        }
        log.info("Deleting duplicate place row: ID={}, Name='{}', Slug='{}'", duplicate.getId(), duplicate.getName(), duplicate.getSlug());
        placeRepository.delete(duplicate);
    }

    private void purgeOrphanedDuplicates(Set<Long> canonicalIds) {
        List<Place> allPlaces = placeRepository.findAll();
        for (Place p : allPlaces) {
            if (!canonicalIds.contains(p.getId())) {
                Place canonicalMatch = findCanonicalMatchForOrphan(p);
                List<CircuitPlace> circuitPlaces = circuitPlaceRepository.findByPlaceId(p.getId());
                for (CircuitPlace cp : circuitPlaces) {
                    if (canonicalMatch != null) {
                        cp.setPlace(canonicalMatch);
                        circuitPlaceRepository.save(cp);
                    } else {
                        circuitPlaceRepository.delete(cp);
                    }
                }
                log.info("Purging orphaned database place: ID={}, Name='{}', Slug='{}'", p.getId(), p.getName(), p.getSlug());
                placeRepository.delete(p);
            }
        }
    }

    private Place findCanonicalMatchForOrphan(Place orphan) {
        if (orphan.getSlug() != null && SLUG_ALIASES.containsKey(orphan.getSlug().toLowerCase())) {
            String canonicalSlug = SLUG_ALIASES.get(orphan.getSlug().toLowerCase());
            Optional<Place> match = placeRepository.findBySlug(canonicalSlug);
            if (match.isPresent()) return match.get();
        }
        String orphanName = orphan.getName() != null ? orphan.getName().toLowerCase().trim() : "";
        if (!orphanName.isEmpty()) {
            return placeRepository.findByNameIgnoreCase(orphanName).orElse(null);
        }
        return null;
    }

    private String generateSlug(String name) {
        return name.toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
    }

    private int parseElevation(String elevStr) {
        if (elevStr == null || elevStr.isBlank()) return 50;
        try {
            String cleaned = elevStr.replaceAll("[^0-9]", "");
            if (!cleaned.isEmpty()) {
                return Integer.parseInt(cleaned);
            }
        } catch (NumberFormatException ignored) {
            // Non-numeric elevation fallback
        }
        return 50;
    }
}

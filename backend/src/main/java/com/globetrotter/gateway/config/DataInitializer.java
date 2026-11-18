package com.globetrotter.gateway.config;

import com.globetrotter.gateway.model.*;
import com.globetrotter.gateway.payload.BookingRequest;
import com.globetrotter.gateway.repository.*;
import com.globetrotter.gateway.service.BookingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
@Order(2)
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PlaceRepository placeRepository;
    private final CircuitRepository circuitRepository;
    private final CircuitPlaceRepository circuitPlaceRepository;
    private final BookingRepository bookingRepository;
    private final BookingService bookingService;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        log.info("Synchronizing Andhra Pradesh & Telangana 59-district circuits for Globetrotter Gateway...");

        // 0. Purge any unauthorized circuits & places to strictly maintain AP & Telangana catalog
        List<String> validCircuitSlugs = List.of(
                "vizag-heritage-coastal-circuit",
                "araku-nature-cave-circuit",
                "tirupati-heritage-divine-circuit",
                "hyderabad-royal-heritage-circuit",
                "warangal-kakatiya-unesco-circuit",
                "rayalaseema-canyon-caves-circuit",
                "telangana-nature-heritage-pass",
                "palnadu-guntur-heritage-citadel-circuit"
        );
        for (Circuit c : circuitRepository.findAll()) {
            if (!validCircuitSlugs.contains(c.getSlug())) {
                log.info("Purging unauthorized circuit: {} (slug={})", c.getTitle(), c.getSlug());
                circuitPlaceRepository.deleteAll(c.getCircuitPlaces());
                circuitRepository.delete(c);
            }
        }
        for (Place p : placeRepository.findAll()) {
            if (p.getState() != null && !p.getState().equalsIgnoreCase("Andhra Pradesh") && !p.getState().equalsIgnoreCase("Telangana")) {
                log.info("Purging out-of-state place: {} ({})", p.getName(), p.getState());
                placeRepository.delete(p);
            }
        }

        // Synchronize authentic local banner images, states, and regions for all circuits
        record CircuitMeta(String state, String region, String banner) {}
        Map<String, CircuitMeta> authenticCircuits = Map.of(
                "vizag-heritage-coastal-circuit", new CircuitMeta("Andhra Pradesh", "Coastal Andhra", "/images/circuits/vizag.jpg"),
                "araku-nature-cave-circuit", new CircuitMeta("Andhra Pradesh", "Eastern Ghats", "/images/circuits/araku.jpg"),
                "tirupati-heritage-divine-circuit", new CircuitMeta("Andhra Pradesh", "Rayalaseema", "/images/circuits/tirupati.jpg"),
                "hyderabad-royal-heritage-circuit", new CircuitMeta("Telangana", "Deccan Capital", "/images/circuits/hyderabad.jpg"),
                "warangal-kakatiya-unesco-circuit", new CircuitMeta("Telangana", "Kakatiya Corridor", "/images/circuits/warangal.jpg"),
                "rayalaseema-canyon-caves-circuit", new CircuitMeta("Andhra Pradesh", "Rayalaseema", "/images/circuits/gandikota.jpg"),
                "telangana-nature-heritage-pass", new CircuitMeta("Telangana", "Northern Forest & River Valley", "/images/circuits/nagarjunakonda.jpg"),
                "palnadu-guntur-heritage-citadel-circuit", new CircuitMeta("Andhra Pradesh", "Palnadu & Guntur", "/images/circuits/palnadu.jpg")
        );
        for (Map.Entry<String, CircuitMeta> entry : authenticCircuits.entrySet()) {
            circuitRepository.findBySlug(entry.getKey()).ifPresent(c -> {
                c.setState(entry.getValue().state());
                c.setRegion(entry.getValue().region());
                c.setBannerImage(entry.getValue().banner());
                circuitRepository.save(c);
            });
        }

        // 1. Seed Users if not present
        if (userRepository.count() == 0) {
            User admin = User.builder()
                    .email("admin@globetrotter.com")
                    .password(passwordEncoder.encode("admin123"))
                    .fullName("Tourism Director (Admin)")
                    .phoneNumber("+91 98765 00001")
                    .role(Role.ROLE_ADMIN)
                    .build();
            userRepository.save(admin);

            User staff = User.builder()
                    .email("staff@globetrotter.com")
                    .password(passwordEncoder.encode("staff123"))
                    .fullName("Kailasagiri Gate Inspector (Staff)")
                    .phoneNumber("+91 98765 00002")
                    .role(Role.ROLE_STAFF)
                    .build();
            userRepository.save(staff);

            User tourist = User.builder()
                    .email("tourist@globetrotter.com")
                    .password(passwordEncoder.encode("tourist123"))
                    .fullName("Aarav Sharma")
                    .phoneNumber("+91 98765 43210")
                    .role(Role.ROLE_TOURIST)
                    .build();
            userRepository.save(tourist);
        }

        // ══════════════════════════════════════════════════════════════════════════════
        // REGION 1: ANDHRA PRADESH - COASTAL (Visakhapatnam)
        // ══════════════════════════════════════════════════════════════════════════════
        Place kailasagiri = getOrCreatePlace("Kailasagiri Hilltop Park & Ropeway", "kailasagiri-hilltop-park-ropeway", "Heritage & Scenic",
                "Andhra Pradesh", "Visakhapatnam",
                "Hilltop park offering panoramic views of the Bay of Bengal, iconic Shiva-Parvati statues, and a scenic ropeway.",
                17.7492, 83.3424, "09:00 AM", "08:00 PM", new BigDecimal("100.00"),
                null,
                "Hill Top Rd, Visakhapatnam, AP 530043",
                "04:30 PM", "06:30 PM", "Golden hour sunset over the Bay of Bengal coastline with scenic illuminated ropeway ride.",
                "05:00 PM", "07:30 PM", 173);

        Place rkBeach = getOrCreatePlace("Ramakrishna (RK) Beach & Seafront Promenade", "ramakrishna-rk-beach-seafront-promenade", "Coastal Promenade",
                "Andhra Pradesh", "Visakhapatnam",
                "Vibrant urban beachfront featuring seaside walking esplanades, war memorials, cultural statues, and local cuisine.",
                17.7126, 83.3235, "05:00 AM", "10:00 PM", new BigDecimal("50.00"),
                null,
                "Beach Rd, Jalari Peta, Visakhapatnam, AP 530002",
                "05:30 AM", "08:00 AM", "Sunrise breeze and morning fitness promenade along the ocean walkway.",
                "06:00 PM", "09:00 PM", 8);

        Place submarine = getOrCreatePlace("INS Kurusura Submarine Museum", "ins-kurusura-submarine-museum", "Naval Museum",
                "Andhra Pradesh", "Visakhapatnam",
                "South Asia's first submarine museum housed inside an actual decommissioned Russian-built Soviet submarine on the beachfront.",
                17.7169, 83.3323, "02:00 PM", "08:30 PM", new BigDecimal("150.00"),
                null,
                "RK Beach Rd, Kirlampudi Layout, Visakhapatnam, AP 530017",
                "02:30 PM", "04:30 PM", "Mid-afternoon quiet window inside South Asia's premier decommissioned naval submarine.",
                "05:00 PM", "07:30 PM", 10);

        Place aircraft = getOrCreatePlace("TU-142M Aircraft Museum", "tu-142m-aircraft-museum", "Aviation Museum",
                "Andhra Pradesh", "Visakhapatnam",
                "World-renowned Tupolev maritime reconnaissance aircraft converted into an interactive museum with flight simulators.",
                17.7185, 83.3340, "02:00 PM", "08:30 PM", new BigDecimal("120.00"),
                null,
                "Beach Rd, Opposite Submarine Museum, Visakhapatnam, AP 530017",
                "03:30 PM", "05:00 PM", "Interactive aviation cockpit and naval flight simulator exploration.",
                "05:30 PM", "08:00 PM", 10);

        if (circuitRepository.findBySlug("vizag-heritage-coastal-circuit").isEmpty()) {
            Circuit vizagCircuit = circuitRepository.save(Circuit.builder()
                    .title("Vizag Heritage & Coastal Circuit")
                    .slug("vizag-heritage-coastal-circuit")
                    .state("Andhra Pradesh")
                    .region("Coastal Andhra")
                    .tag("Best Seller • Coastal Discovery")
                    .summary("Experience the best of Visakhapatnam in one digital pass: hilltop heights, coastal breezes, and legendary naval museums.")
                    .description("The premier tourist circuit of the Eastern coast. Covers 4 major landmarks with seamless QR check-in at every gate. Valid for 3 days.")
                    .basePrice(new BigDecimal("420.00"))
                    .discountedCircuitPrice(new BigDecimal("299.00"))
                    .validityDays(3)
                    .bannerImage("/images/circuits/vizag.jpg")
                    .featured(true)
                    .active(true)
                    .circuitPlaces(new ArrayList<>())
                    .build());

            addCircuitPlace(vizagCircuit, kailasagiri, 1, 90, "Morning start with panoramic hilltop views");
            addCircuitPlace(vizagCircuit, rkBeach, 2, 60, "15 min scenic coastal road descent");
            addCircuitPlace(vizagCircuit, submarine, 3, 60, "Located directly on the beach walkway");
            addCircuitPlace(vizagCircuit, aircraft, 4, 60, "Across the road from Submarine Museum");
        }

        // ══════════════════════════════════════════════════════════════════════════════
        // REGION 2: ANDHRA PRADESH - EASTERN GHATS (Araku Valley)
        // ══════════════════════════════════════════════════════════════════════════════
        Place borraCaves = getOrCreatePlace("Borra Caves", "borra-caves", "Nature & Geology",
                "Andhra Pradesh", "Araku Valley",
                "Million-year-old limestone stalactite and stalagmite karst formations deep inside the Ananthagiri hills.",
                18.2804, 83.0396, "10:00 AM", "05:00 PM", new BigDecimal("180.00"),
                null,
                "Ananthagiri Mandal, Araku Valley, AP 531149",
                "10:00 AM", "11:30 AM", "Stunning natural daylight penetration through cavern ceiling onto limestone stalactites.",
                "12:00 PM", "02:30 PM", 705,
                "Direct Paved Road Access + 300 Cave Steps Descent/Ascent",
                new BigDecimal("0.00"),
                new BigDecimal("50.00"),
                1.2,
                "MODERATE",
                "Directly accessible via paved highway from Araku or Vizag. Parking lot is 150m from ticket counter. Cave exploration requires walking down and climbing back up ~300 concrete steps (80m vertical depth). Cavern interior is humid; cardiac and asthma patients should pace themselves. Outside vendors sell authentic coal-roasted Bamboo Chicken (₹200/stalk).",
                new BigDecimal("260.00"));

        Place katikiFalls = getOrCreatePlace("Katiki Waterfalls", "katiki-waterfalls", "Nature & Adventure",
                "Andhra Pradesh", "Araku Valley",
                "A breathtaking 50-foot cascading mountain waterfall originated from the Gosthani River in dense forest terrain.",
                18.2930, 83.0080, "09:00 AM", "04:30 PM", new BigDecimal("80.00"),
                null,
                "Gatevalsa / Katiki Village, Araku, AP 531149",
                "10:30 AM", "01:30 PM", "Optimal overhead sunlight illuminates the 50ft forest waterfall; safe descent before late afternoon mist.",
                "12:30 PM", "03:00 PM", 820,
                "Local Tribal Committee 4x4 Jeep + 2.5km Stream Trek",
                new BigDecimal("200.00"),
                new BigDecimal("50.00"),
                2.5,
                "STRENUOUS",
                "Private sedans and hatchbacks are strictly stopped at Gatevalsa / Borra railway gate junction. You must hire an authorized local tribal committee 4x4 Jeep (₹200–₹250/seat or ₹1,500–₹2,000 for private jeep) navigating 7 km of rough unpaved boulder and mud riverbed track. Jeep drops near railway track, followed by a mandatory 2.5 km hike across slippery moss-covered rocks and streams. Wear high-traction footwear. Last jeep departs back at 4:30 PM before dark.",
                new BigDecimal("350.00"));

        Place tribalMuseum = getOrCreatePlace("Araku Tribal Museum", "araku-tribal-museum", "Cultural Heritage",
                "Andhra Pradesh", "Araku Valley",
                "Showcases the authentic lifestyle, arts, handicraft, and indigenous traditions of Eastern Ghats tribes.",
                18.3333, 82.8833, "10:00 AM", "06:00 PM", new BigDecimal("60.00"),
                null,
                "Araku Valley Main Rd, Araku, AP 531156",
                "03:30 PM", "05:30 PM", "Relaxing indoor indigenous culture exhibits and authentic Araku valley organic coffee tasting.",
                "11:30 AM", "01:30 PM", 910,
                "Paved Road Access & Wheelchair Ramp",
                new BigDecimal("0.00"),
                new BigDecimal("30.00"),
                0.2,
                "EASY",
                "Main agency town landmark with direct highway access. Courtyard hosts live Dhimsa tribal dance every 45 minutes between 2:30 PM and 5:00 PM. Official Girijan Co-operative Corporation (GCC) store inside sells certified forest honey, amla, and handmade tribal artefacts. Roadside sellers outside sell plastic beads as tribal coral—avoid them.",
                new BigDecimal("110.00"));

        Place coffeeMuseum = getOrCreatePlace("Araku Coffee Museum & GCC Experience Center", "araku-coffee-museum-gcc-experience-center", "Cultural & Culinary",
                "Andhra Pradesh", "Araku Valley",
                "Dedicated to the heritage of Araku Arabica coffee with live bean roasting, tasting lounges, and GCC organic certifications.",
                18.3315, 82.8850, "08:30 AM", "07:00 PM", new BigDecimal("40.00"),
                null,
                "Opposite Tribal Museum, Araku, AP 531156",
                "09:00 AM", "11:30 AM", "Freshly roasted single-origin Arabica bean tasting and live roaster demonstrations.",
                "03:00 PM", "05:00 PM", 920,
                "Paved Road Access (Opposite Tribal Museum)",
                new BigDecimal("0.00"),
                new BigDecimal("30.00"),
                0.1,
                "EASY",
                "Situated in central Araku town opposite the Tribal Museum. Ample municipal vehicle parking. Features certified GCC organic counters, live Arabica bean roasting demonstration, and coffee sampling. Buy only sealed packets stamped with GCC / Coffee Board batch numbers to avoid adulterated chicory blends sold by unofficial roadside hawkers.",
                new BigDecimal("120.00"));

        Place padmapuramGardens = getOrCreatePlace("Padmapuram Botanical Gardens & Tree Top Huts", "padmapuram-botanical-gardens-tree-top-huts", "Botanical & Leisure",
                "Andhra Pradesh", "Araku Valley",
                "Historic 1942 botanical garden featuring rare orchids, nursery groves, miniature toy train, and hanging tree-top huts.",
                18.3280, 82.8750, "08:30 AM", "06:00 PM", new BigDecimal("40.00"),
                null,
                "Padmapuram, Araku Valley, AP 531149",
                "08:30 AM", "10:30 AM", "Morning dew on orchids and WWII historic treetop huts.",
                "12:00 PM", "03:00 PM", 910,
                "Paved Road Access & Garden Walking Trails",
                new BigDecimal("0.00"),
                new BigDecimal("30.00"),
                0.8,
                "EASY",
                "Direct motorable access 2.5 km from Araku railway station. Wide paved walking paths inside the 26-acre botanical garden. Toy train operates regularly (₹30 ticket). Hanging tree-top huts must be booked weeks ahead on the official APTDC portal; beware of local touts claiming on-spot room reservations.",
                new BigDecimal("100.00"));

        if (circuitRepository.findBySlug("araku-nature-cave-circuit").isEmpty()) {
            Circuit arakuCircuit = circuitRepository.save(Circuit.builder()
                    .title("Araku Valley Nature & Cave Explorer")
                    .slug("araku-nature-cave-circuit")
                    .state("Andhra Pradesh")
                    .region("Eastern Ghats")
                    .tag("Weekend Getaway • Eco Tour")
                    .summary("Explore ancient subterranean limestone caves, misty mountain waterfalls, coffee plantations, and indigenous culture.")
                    .description("Venture into the Eastern Ghats! Includes subterranean Borra Caves, Katiki Waterfalls, Araku Tribal Museum, Coffee Museum, and Padmapuram Gardens.")
                    .basePrice(new BigDecimal("450.00"))
                    .discountedCircuitPrice(new BigDecimal("299.00"))
                    .validityDays(4)
                    .bannerImage("/images/circuits/araku.jpg")
                    .featured(true)
                    .active(true)
                    .circuitPlaces(new ArrayList<>())
                    .build());

            addCircuitPlace(arakuCircuit, borraCaves, 1, 120, "Fascinating stalactite cave exploration");
            addCircuitPlace(arakuCircuit, katikiFalls, 2, 120, "25 mins jeep safari trail from Borra Caves");
            addCircuitPlace(arakuCircuit, tribalMuseum, 3, 60, "Indigenous handicrafts and tribal coffee tasting");
            addCircuitPlace(arakuCircuit, coffeeMuseum, 4, 45, "Live bean roasting and tasting lounge");
            addCircuitPlace(arakuCircuit, padmapuramGardens, 5, 60, "Botanical tree-top huts and WWII nursery");
        }

        // ══════════════════════════════════════════════════════════════════════════════
        // REGION 3: ANDHRA PRADESH - RAYALASEEMA (Tirupati)
        // ══════════════════════════════════════════════════════════════════════════════
        Place kapilaTheertham = getOrCreatePlace("Kapila Theertham Mountain Waterfall & Shiva Shrine", "kapila-theertham-mountain-waterfall-shiva-shrine", "Spiritual & Nature",
                "Andhra Pradesh", "Tirupati",
                "Ancient sacred waterfalls and cave shrine situated at the foot of Seshachalam hills dedicated to Lord Shiva.",
                13.6508, 79.4283, "06:00 AM", "08:00 PM", new BigDecimal("50.00"),
                null,
                "KT Rd, Sri Padmavathi Mahila Visvavidyalayam, Tirupati, AP 517501");

        Place chandragiriFort = getOrCreatePlace("Chandragiri Fort & Raja-Rani Archaeological Palaces", "chandragiri-fort-raja-rani-archaeological-palaces", "Medieval Heritage",
                "Andhra Pradesh", "Tirupati",
                "11th-century historical fort and royal palace of the Vijayanagara Empire with crown jewel Indo-Saracenic architecture.",
                13.5833, 79.3167, "09:00 AM", "05:30 PM", new BigDecimal("100.00"),
                null,
                "Chandragiri, Tirupati District, AP 517101");

        Place silathoranam = getOrCreatePlace("Silathoranam Rare Natural Geological Rock Arch", "silathoranam-rare-natural-geological-rock-arch", "Natural Wonder",
                "Andhra Pradesh", "Tirupati",
                "A rare prehistoric natural rock formation arch dating back 1.5 billion years in the sacred Tirumala hills.",
                13.6833, 79.3500, "08:00 AM", "06:00 PM", new BigDecimal("50.00"),
                null,
                "Near Chakra Theertham, Tirumala, Tirupati, AP 517504");

        if (circuitRepository.findBySlug("tirupati-heritage-divine-circuit").isEmpty()) {
            Circuit tirupatiCircuit = circuitRepository.save(Circuit.builder()
                    .title("Tirupati Divine Heritage & Fort Pass")
                    .slug("tirupati-heritage-divine-circuit")
                    .state("Andhra Pradesh")
                    .region("Rayalaseema")
                    .tag("Spiritual & Historical")
                    .summary("Explore the rich heritage of Rayalaseema: sacred waterfalls, historic Vijayanagara forts, and geological rock wonders.")
                    .description("Experience Tirupati beyond the temple queues. Includes access to Chandragiri Fort Palace, Kapila Theertham, and the Silathoranam Natural Arch.")
                    .basePrice(new BigDecimal("200.00"))
                    .discountedCircuitPrice(new BigDecimal("149.00"))
                    .validityDays(3)
                    .bannerImage("/images/circuits/tirupati.jpg")
                    .featured(true)
                    .active(true)
                    .circuitPlaces(new ArrayList<>())
                    .build());

            addCircuitPlace(tirupatiCircuit, kapilaTheertham, 1, 60, "Sacred morning waterfalls visit at foot of hills");
            addCircuitPlace(tirupatiCircuit, chandragiriFort, 2, 90, "Royal Vijayanagara palace & sound-light show grounds");
            addCircuitPlace(tirupatiCircuit, silathoranam, 3, 60, "Prehistoric geological arch walk");
        }

        // ══════════════════════════════════════════════════════════════════════════════
        // REGION 4: TELANGANA - HYDERABAD METRO & NIZAMI HERITAGE
        // ══════════════════════════════════════════════════════════════════════════════
        Place charminar = getOrCreatePlace("Charminar & Laad Bazaar Lacquer Bangles", "charminar-laad-bazaar-lacquer-bangles", "Heritage Landmark",
                "Telangana", "Hyderabad",
                "1591 AD architectural centerpiece of Hyderabad featuring 4 grand minarets, surrounded by the historic Laad Bazaar lacquer bangle market.",
                17.3616, 78.4747, "09:30 AM", "05:30 PM", new BigDecimal("50.00"),
                null,
                "Charminar Rd, Char Kaman, Ghansi Bazaar, Hyderabad, Telangana 500002",
                "07:00 AM", "09:00 AM", "Serene morning photography before crowds, followed by hot Irani chai at Nimrah Cafe.",
                "04:30 PM", "08:30 PM", 536);

        Place golconda = getOrCreatePlace("Golconda Fort & Acoustic Portico Walk", "golconda-fort-acoustic-portico-walk", "Medieval Fortress",
                "Telangana", "Hyderabad",
                "16th-century diamond capital citadel of the Qutb Shahi kings, world-famous for its acoustic engineering portico and sound & light show.",
                17.3833, 78.4011, "09:00 AM", "05:30 PM", new BigDecimal("120.00"),
                null,
                "Ibrahim Bagh, Hyderabad, Telangana 500008",
                "03:30 PM", "05:30 PM", "Breeze climbs the 360-step granite ascent; sunset panorama over Hyderabad skyline from Bala Hissar.",
                "11:00 AM", "02:00 PM", 580);

        Place salarJung = getOrCreatePlace("Salar Jung Museum (World's Largest One-Man Art Collection)", "salar-jung-museum-world-s-largest-one-man-art-collection", "Art & Artifacts",
                "Telangana", "Hyderabad",
                "One of the world's greatest one-man art collections housing 43,000 artifacts including the Veiled Rebecca and 19th-century musical clock.",
                17.3713, 78.4803, "10:00 AM", "05:00 PM", new BigDecimal("80.00"),
                null,
                "Darulshifa, Hyderabad, Telangana 500002",
                "11:30 AM", "01:30 PM", "Witness the historic British musical mechanical clock strike on the hour in central atrium.",
                "02:00 PM", "04:30 PM", 530);

        Place chowmahalla = getOrCreatePlace("Chowmahalla Palace & Royal Vintage Car Collection", "chowmahalla-palace-royal-vintage-car-collection", "Royal Palace",
                "Telangana", "Hyderabad",
                "18th-century official residence of the Asaf Jahi Nizams featuring the Grand Khilwat Durbar Hall and 1912 Canary Yellow Rolls-Royce.",
                17.3578, 78.4717, "10:00 AM", "05:00 PM", new BigDecimal("100.00"),
                null,
                "Motigalli, Khilwat, Hyderabad, Telangana 500002",
                "02:30 PM", "04:30 PM", "Sunlight streams through Belgian crystal chandeliers in the royal grand marble throne hall.",
                "11:30 AM", "01:30 PM", 535);

        if (circuitRepository.findBySlug("hyderabad-royal-heritage-circuit").isEmpty()) {
            Circuit hydCircuit = circuitRepository.save(Circuit.builder()
                    .title("Hyderabad Heritage & Royal Nizami Pass")
                    .slug("hyderabad-royal-heritage-circuit")
                    .state("Telangana")
                    .region("Deccan Capital")
                    .tag("Royal Heritage • City Pass")
                    .summary("Discover the grandeur of the Nizams: Charminar, Golconda Fort, Salar Jung Museum, and Chowmahalla Palace.")
                    .description("The quintessential Telangana capital pass. Seamless fast-track entry to Hyderabad's premier cultural treasures.")
                    .basePrice(new BigDecimal("350.00"))
                    .discountedCircuitPrice(new BigDecimal("249.00"))
                    .validityDays(3)
                    .bannerImage("/images/circuits/hyderabad.jpg")
                    .featured(true)
                    .active(true)
                    .circuitPlaces(new ArrayList<>())
                    .build());

            addCircuitPlace(hydCircuit, charminar, 1, 90, "Morning heritage start at the heart of Old City");
            addCircuitPlace(hydCircuit, chowmahalla, 2, 90, "Short walk from Charminar to royal Nizami palace");
            addCircuitPlace(hydCircuit, salarJung, 3, 120, "Afternoon art exploration and musical clock");
            addCircuitPlace(hydCircuit, golconda, 4, 150, "Sunset breeze on citadel and evening sound & light show");
        }

        // Warangal & UNESCO Kakatiya Circuit
        Place thousandPillar = getOrCreatePlace("Thousand Pillar Temple (Sri Rudreshwara Swamy)", "thousand-pillar-temple-sri-rudreshwara-swamy", "Kakatiya Architecture",
                "Telangana", "Warangal",
                "1163 AD Kakatiya architectural masterpiece dedicated to Shiva, Vishnu, and Surya with mirror-polished black basalt Nandi.",
                17.9833, 79.5833, "06:00 AM", "08:30 PM", new BigDecimal("0.00"),
                null,
                "Hanamkonda, Warangal, Telangana 506001",
                "06:30 AM", "09:00 AM", "Sun casts intricate shadows through the star-shaped triple-shrine mandapa.",
                "11:00 AM", "03:00 PM", 270,
                "Direct Motorable Access & Dedicated Parking",
                new BigDecimal("0.00"),
                new BigDecimal("30.00"),
                0.2,
                "EASY",
                "Located on the main Hanamkonda-Warangal highway. Paved pathways inside the temple complex. Dedicated footwear custody stand (₹10). Black basalt Nandi is monolithically carved out of a single rock. No entry fee.",
                new BigDecimal("50.00"));

        Place warangalFort = getOrCreatePlace("Warangal Fort & Kakatiya Kala Thoranam", "warangal-fort-kakatiya-kala-thoranam", "Archaeological Heritage",
                "Telangana", "Warangal",
                "13th-century fort ruins featuring the Four Kakatiya Kala Thoranam arches that serve as the official State Emblem of Telangana.",
                17.9550, 79.6170, "09:00 AM", "06:00 PM", new BigDecimal("50.00"),
                null,
                "Khilla Warangal, Telangana 506002",
                "03:30 PM", "05:45 PM", "Warm late afternoon sunlight illuminates the 4 colossal stone gateway arches.",
                "12:00 PM", "02:30 PM", 275,
                "Paved Road to Archaeological Park Gate",
                new BigDecimal("0.00"),
                new BigDecimal("30.00"),
                0.5,
                "EASY",
                "ASI maintained archaeological garden around the central ruins. Level lawn walking paths. Sound & Light show runs in English and Telugu in the evenings (7:00 PM). Carry mosquito repellent for evening shows.",
                new BigDecimal("90.00"));

        Place ramappaUNESCO = getOrCreatePlace("Ramappa Temple (Sri Rudreshwara Swamy \u2014 UNESCO World Heritage Site)", "ramappa-temple-sri-rudreshwara-swamy-unesco-world-heritage-site", "UNESCO World Heritage",
                "Telangana", "Mulugu",
                "1213 AD Kakatiya engineering wonder built with floating bricks, sandbox anti-earthquake foundation, and black basalt Madanika bracket figures.",
                18.2588, 79.9436, "06:00 AM", "06:00 PM", new BigDecimal("50.00"),
                null,
                "Palampet, Venkatapur Mandal, Mulugu District, Telangana 506345",
                "08:30 AM", "10:30 AM", "Sunbeams highlight mirror-polished black basalt dancer sculptures on floating brick temple.",
                "12:30 PM", "03:00 PM", 210,
                "Direct Paved Road + ASI Perimeter Walkway",
                new BigDecimal("0.00"),
                new BigDecimal("40.00"),
                0.4,
                "EASY",
                "Direct motorable access 65 km from Warangal. ASI entry ticket counter at entrance. Walking around the 6-foot elevated star platform is easy on paved stone. Floating brick demonstration tank is located near the eastern gateway. Certified ASI guides charge ₹300 per group and are strongly recommended to explain the sandbox earthquake foundation.",
                new BigDecimal("120.00"));

        Place laknavaramLake = getOrCreatePlace("Laknavaram Lake & Suspension Bridges", "laknavaram-lake-suspension-bridges", "Eco-Tourism & Lakes",
                "Telangana", "Mulugu",
                "10,000-acre medieval lake created by Kakatiya kings featuring 13 forested hill islands linked by hanging suspension bridges.",
                18.1500, 80.0500, "08:00 AM", "06:00 PM", new BigDecimal("80.00"),
                null,
                "Govindaraopet Mandal, Mulugu District, Telangana 506344",
                "03:30 PM", "06:00 PM", "Breathtaking sunset over 13 forested hill islands linked by illuminated suspension bridges.",
                "11:00 AM", "01:30 PM", 225,
                "Paved Road to Lake Jetty + Suspension Rope Bridge",
                new BigDecimal("50.00"),
                new BigDecimal("50.00"),
                0.8,
                "EASY",
                "Direct motorable road from Mulugu to TSTDC Haritha resort jetty. Entry to hanging rope bridge costs ₹50. Speedboats charge ₹350–₹500 for a 15-minute island circuit. Beware of slippery wooden planks on the bridge after rainfall. Lakeside cottages must be reserved weeks in advance.",
                new BigDecimal("180.00"));

        Place kuntalaFalls = getOrCreatePlace("Kuntala Waterfalls (Highest Waterfall in Telangana)", "kuntala-waterfalls-highest-waterfall-in-telangana", "Nature & Adventure",
                "Telangana", "Adilabad",
                "The highest waterfall in Telangana cascading down 147 feet through dense Sahyadri teak forest gorges.",
                19.2940, 78.4720, "08:30 AM", "05:00 PM", new BigDecimal("30.00"),
                null,
                "Neredigonda Mandal, Adilabad District, Telangana 504323",
                "09:30 AM", "12:00 PM", "Spectacular sunlight over the 147ft twin cascade and safe ascent before afternoon heat.",
                "12:30 PM", "03:30 PM", 380,
                "Paved Highway to Forest Parking + 408 Steep Rock-Cut Steps",
                new BigDecimal("0.00"),
                new BigDecimal("50.00"),
                1.5,
                "STRENUOUS",
                "Vehicles park at the forest department parking area. Accessing the waterfall base requires descending and climbing back up 408 steep concrete and stone steps into the deep gorge (approx. 45–60 min ascent). Zero elevator access. Absolutely no swimming in the plunge pool due to severe, fatal underwater vortex currents. Forest gates strictly close at 5:00 PM.",
                new BigDecimal("110.00"));

        Place nagarjunakonda = getOrCreatePlace("Nagarjunakonda Island Archaeological Museum", "nagarjunakonda-island-archaeological-museum", "Archaeological Island",
                "Andhra Pradesh", "Palnadu",
                "Ancient 2nd-century Buddhist university & monastery complex relocated onto an island in the middle of Nagarjuna Sagar reservoir.",
                16.5167, 79.2333, "09:00 AM", "04:00 PM", new BigDecimal("40.00"),
                null,
                "Vijayapuri Jetty, Nagarjuna Sagar, Palnadu District, AP 522439",
                "10:00 AM", "01:30 PM", "Catch morning ferry cruise across the turquoise reservoir to explore ancient Buddhist stupas.",
                "12:00 PM", "02:00 PM", 120,
                "Mandatory TSTDC Passenger Ferry Cruise (45 min each way)",
                new BigDecimal("150.00"),
                new BigDecimal("50.00"),
                1.2,
                "MODERATE",
                "Accessible ONLY via official TSTDC mechanized passenger boats departing from Vijayapuri launch jetty. Boat departure slots are strictly fixed: 09:30 AM, 11:30 AM, and 01:30 PM (ticket counter closes at 2:00 PM). Round-trip boat journey takes 45 minutes across the reservoir each way. Museum is CLOSED ON FRIDAYS. Wear hats and carry drinking water as the island is arid with zero shops.",
                new BigDecimal("250.00"));

        Place belumCaves = getOrCreatePlace("Belum Caves (Subterranean Karst Limestone Passages)", "belum-caves-subterranean-karst-limestone-passages", "Nature & Geology",
                "Andhra Pradesh", "Nandyal",
                "The second largest cave system in the Indian subcontinent featuring 3.5 km of subterranean passages and 150-foot-deep Pataalaganga.",
                15.1025, 78.1114, "10:00 AM", "05:00 PM", new BigDecimal("70.00"),
                null,
                "1/1, Belum Caves Rd, Kolimigundla, Nandyal, AP 518123",
                "10:30 AM", "01:00 PM", "Illuminated underground limestone pathways and rare black limestone stalactite chambers.",
                "01:30 PM", "03:30 PM", 260,
                "Direct Motorable Road + 150ft Deep Subterranean Walkway",
                new BigDecimal("0.00"),
                new BigDecimal("50.00"),
                1.5,
                "MODERATE",
                "Direct highway access from Banaganapalle. Paved path leads into subterranean sinkhole. Interior spans 1.5 km of illuminated passageways descending to Pataalaganga (150 feet below ground level). Air circulation is powered by continuous electric blowers; if blowers fail, interior humidity and CO2 rise quickly. Carry water and wear breathable clothing.",
                new BigDecimal("140.00"));

        Place gandikota = getOrCreatePlace("Gandikota Grand Canyon of India & Historic Fort", "gandikota-grand-canyon-of-india-historic-fort", "Geological Wonder",
                "Andhra Pradesh", "Kadapa",
                "The Grand Canyon of India carved through the Erramala hills by the Pennar River with a 13th-century red sandstone fort.",
                14.8150, 78.2860, "06:00 AM", "07:00 PM", new BigDecimal("0.00"),
                null,
                "Gandikota, Jammalamadugu Mandal, YSR Kadapa District, AP 516434",
                "05:00 PM", "06:30 PM", "Spectacular sunset illuminates 300-foot deep red sandstone gorge over Pennar River.",
                "11:00 AM", "03:00 PM", 280,
                "Fort Parking + 1.2km Village Heritage Walk to Gorge Edge",
                new BigDecimal("0.00"),
                new BigDecimal("30.00"),
                1.2,
                "MODERATE",
                "Vehicles park outside the medieval fort gate or near the Jamia Masjid ruins. From parking, walk 1.2 km through the living village and past the Raghunatha Swamy temple to reach the clifftop gorge viewpoint overlooking the Pennar River. Walking over jagged red sandstone boulders requires grip shoes. Clifftop has zero safety railings—maintain a strict 3-meter boundary from edge. Kayaking at bottom requires 40-minute steep gorge scramble (₹250).",
                new BigDecimal("100.00"));

        if (circuitRepository.findBySlug("warangal-kakatiya-unesco-circuit").isEmpty()) {
            Circuit warangalCircuit = circuitRepository.save(Circuit.builder()
                    .title("Warangal Kakatiya & UNESCO Ramappa Circuit")
                    .slug("warangal-kakatiya-unesco-circuit")
                    .state("Telangana")
                    .region("Kakatiya Corridor")
                    .tag("UNESCO World Heritage • Ancient Engineering")
                    .summary("Journey through the golden age of Kakatiya architecture: Thousand Pillar Temple, Warangal Fort, Ramappa UNESCO, and Laknavaram Lake.")
                    .description("Experience world-class stone carving and ancient engineering marvels. Valid for 3 days with digital QR access.")
                    .basePrice(new BigDecimal("300.00"))
                    .discountedCircuitPrice(new BigDecimal("219.00"))
                    .validityDays(3)
                    .bannerImage("/images/circuits/warangal.jpg")
                    .featured(true)
                    .active(true)
                    .circuitPlaces(new ArrayList<>())
                    .build());

            addCircuitPlace(warangalCircuit, thousandPillar, 1, 60, "Morning star-shaped temple architecture");
            addCircuitPlace(warangalCircuit, warangalFort, 2, 90, "Imperial fort ruins and Kakatiya Kala Thoranam");
            addCircuitPlace(warangalCircuit, ramappaUNESCO, 3, 90, "UNESCO floating brick wonder exploration");
            addCircuitPlace(warangalCircuit, laknavaramLake, 4, 120, "Sunset suspension bridge walk and lake boating");
        }

        // Rayalaseema Geological Wonders Circuit
        if (circuitRepository.findBySlug("rayalaseema-canyon-caves-circuit").isEmpty()) {
            Circuit rayalaseemaCircuit = circuitRepository.save(Circuit.builder()
                    .title("Rayalaseema Geological Wonders & Grand Canyon Pass")
                    .slug("rayalaseema-canyon-caves-circuit")
                    .state("Andhra Pradesh")
                    .region("Rayalaseema")
                    .tag("Grand Canyon • Ancient Karst")
                    .summary("Experience Andhra Pradesh's awe-inspiring natural marvels: Gandikota Grand Canyon of India and Belum Caves subterranean passages.")
                    .description("One seamless pass covering the 300-foot Pennar river gorge at Gandikota and the 3.5km subterranean limestone passages of Belum Caves with illuminated pathways and Pataalaganga.")
                    .basePrice(new BigDecimal("250.00"))
                    .discountedCircuitPrice(new BigDecimal("189.00"))
                    .validityDays(3)
                    .bannerImage("/images/circuits/gandikota.jpg")
                    .featured(true)
                    .active(true)
                    .circuitPlaces(new ArrayList<>())
                    .build());

            addCircuitPlace(rayalaseemaCircuit, gandikota, 1, 150, "Sunset panorama over 300-foot Pennar river canyon and medieval fort");
            addCircuitPlace(rayalaseemaCircuit, belumCaves, 2, 120, "Explore subterranean limestone chambers and Pataalaganga spring");
        }

        // Telangana Nature & Heritage Circuit
        if (circuitRepository.findBySlug("telangana-nature-heritage-pass").isEmpty()) {
            Circuit tgNatureCircuit = circuitRepository.save(Circuit.builder()
                    .title("Telangana Forest Falls & Nagarjunakonda Buddhist Pass")
                    .slug("telangana-nature-heritage-pass")
                    .state("Telangana")
                    .region("Northern Forest & River Valley")
                    .tag("Eco-Waterfalls • Buddhist Island")
                    .summary("Journey through the nature and ancient university history of Telangana: 147-foot Kuntala Waterfalls and Nagarjunakonda Buddhist Island Museum.")
                    .description("Experience the raw beauty of Sahyadri forest falls and cruise the turquoise Nagarjuna Sagar reservoir to the ancient Mahayana Buddhist monastic island.")
                    .basePrice(new BigDecimal("280.00"))
                    .discountedCircuitPrice(new BigDecimal("199.00"))
                    .validityDays(3)
                    .bannerImage("/images/circuits/nagarjunakonda.jpg")
                    .featured(true)
                    .active(true)
                    .circuitPlaces(new ArrayList<>())
                    .build());

            addCircuitPlace(tgNatureCircuit, kuntalaFalls, 1, 120, "Descend into Sahyadri teak forest gorge for highest cascade in Telangana");
            addCircuitPlace(tgNatureCircuit, nagarjunakonda, 2, 150, "Passenger ferry cruise across Nagarjuna Sagar to 2nd-century Buddhist island");
        }

        // ══════════════════════════════════════════════════════════════════════════════
        // REGION: ANDHRA PRADESH - PALNADU & GUNTUR CORRIDOR
        // ══════════════════════════════════════════════════════════════════════════════
        Place kondaveeduFort = getOrCreatePlace("Kondaveedu Fort & Panoramic Hilltop Ghat Road", "kondaveedu-fort-panoramic-hilltop-ghat-road", "Historical Forts & Monuments",
                "Andhra Pradesh", "Palnadu",
                "14th-century capital citadel of the Reddy Kingdom featuring 21 bastions, Tara Buruju, Kathula Bavi, and a scenic 4.5km 21-hairpin ghat road.",
                16.2580, 80.2600, "06:00 AM", "06:00 PM", new BigDecimal("25.00"),
                null,
                "Yadlapadu Mandal, Palnadu District, AP 522549",
                "06:30 AM", "09:00 AM", "Sunrise breeze over 21 hairpin curves and early morning misty ridge views.",
                "11:00 AM", "03:30 PM", 520,
                "Engineered Two-Lane Ghat Road (4.5 km, 21 Hairpin Bends) with Summit Car Parking",
                new BigDecimal("0.00"),
                new BigDecimal("30.00"),
                0.8,
                "MODERATE",
                "Located 25 km from Guntur and 12 km from Chilakaluripet off NH-16. Newly asphalted 4.5 km ghat road with 21 hairpin curves takes vehicles straight to the fort summit parking. Paved stone pathways connect Tara Buruju, Kathula Bavi, and Gopinatha Temple. High-speed ridge winds; carry water as hilltop canteen facilities are basic.",
                new BigDecimal("75.00"));

        Place kotappakonda = getOrCreatePlace("Kotappakonda Sri Trikoteswara Swamy Temple (Koti Lingala Shivalayam & 100-Foot Prabhalu)", "kotappakonda-sri-trikoteswara-swamy-temple-koti-lingala-shivalayam-100-foot-prabhalu", "Heritage & Spiritual",
                "Andhra Pradesh", "Palnadu",
                "Sacred Trikuta hill shrine symbolizing Brahma, Vishnu, and Shiva; home to Koti Lingala Kshetram and legendary 100-foot electrified Prabhalu during Maha Shivaratri.",
                16.1430, 80.0380, "06:00 AM", "08:30 PM", new BigDecimal("20.00"),
                null,
                "Kotappakonda, Narasaraopet Mandal, Palnadu District, AP 522601",
                "06:30 AM", "09:30 AM", "Early morning hill breeze with temple rituals, peacocks, and Koti Lingala parikrama.",
                "10:30 AM", "02:00 PM", 480,
                "Two-Lane Hill Ghat Road OR 703 Historic Stone Steps with Ample Foothill/Hilltop Parking",
                new BigDecimal("0.00"),
                new BigDecimal("30.00"),
                0.5,
                "EASY",
                "Located 13 km from Narasaraopet. Excellent two-lane ghat road with security barriers leads directly to hilltop temple parking, or devotees can climb the historic 703 stone steps built in 1761. Temple Devasthanam provides organized queue complexes, drinking water, and laddu/boondi prasadam counters. During Maha Shivaratri, vehicle movement is restricted to foothill parking lots due to 10-lakh devotee influx.",
                new BigDecimal("60.00"));

        Place guthikondaBilam = getOrCreatePlace("Guthikonda Bilam (Uthikonda Caves & Dakshina Kashi Subterranean Shrine)", "guthikonda-bilam-uthikonda-caves-dakshina-kashi-subterranean-shrine", "Nature & Wildlife",
                "Andhra Pradesh", "Palnadu",
                "Prehistoric subterranean limestone karst cave network and Dakshina Kashi holy shrine where sage Muchukunda meditated and Palnadu battle heroes sheltered.",
                16.4170, 79.8330, "08:00 AM", "05:00 PM", new BigDecimal("20.00"),
                null,
                "Guthikonda Village, Piduguralla Mandal, Palnadu District, AP 522413",
                "08:30 AM", "11:00 AM", "Subterranean 22°C constant coolness with natural stalactite dripping and cave Shiva darshan.",
                "12:00 PM", "02:30 PM", 260,
                "Rural Road + 1.2 km Scenic Hill Scrub Trek to Cave Entrance",
                new BigDecimal("0.00"),
                new BigDecimal("20.00"),
                1.2,
                "MODERATE",
                "Situated 18 km from Piduguralla. Vehicles park near the foothill temple complex. A gentle 1.2 km earthen nature trail through hill scrub leads to the cave mouth. Interior chambers are naturally cool (22°C year-round) but completely dark beyond the entrance; high-power torches/flashlights and sturdy closed walking shoes with solid grip are mandatory. Local temple volunteers organize daily Annadanam for pilgrims.",
                new BigDecimal("50.00"));

        Place haailandResort = getOrCreatePlace("Haailand Water Theme Park & Cultural Resort", "haailand-water-theme-park-cultural-resort", "Theme Parks & Resorts",
                "Andhra Pradesh", "Guntur",
                "48-acre mega entertainment gateway featuring 25+ amusement rides, indoor roller coaster, ocean wave pool, rain dance floor, and Southeast Asian Buddhist architecture.",
                16.4250, 80.5730, "10:00 AM", "06:00 PM", new BigDecimal("800.00"),
                null,
                "NH-16, Chinakakani, Near NRI Hospital, Mangalagiri Mandal, Guntur District, AP 522503",
                "10:30 AM", "01:00 PM", "Morning opening queue rush bypass with direct access to mechanical rides and family wave pools.",
                "01:30 PM", "04:30 PM", 25,
                "Direct NH-16 Highway Drive-In with 500+ Car Parking Capacity",
                new BigDecimal("0.00"),
                new BigDecimal("50.00"),
                0.2,
                "EASY",
                "Located directly on the Vijayawada-Guntur 6-lane National Highway (NH-16) opposite NRI Hospital, equidistant (15 km) from both Guntur and Vijayawada. Massive private vehicle parking and public bus stop at gate. Full day pass includes unlimited access to mechanical dry rides and all water park wave pool zones. Stupa-shaped multi-cuisine food court and Ayurvedic spa on campus.",
                new BigDecimal("860.00"));

        if (circuitRepository.findBySlug("palnadu-guntur-heritage-citadel-circuit").isEmpty()) {
            Circuit palnaduCircuit = circuitRepository.save(Circuit.builder()
                    .title("Palnadu & Guntur Imperial Citadel & Leisure Pass")
                    .slug("palnadu-guntur-heritage-citadel-circuit")
                    .state("Andhra Pradesh")
                    .region("Palnadu & Guntur")
                    .tag("Imperial Forts • Sacred Caves • Theme Resort")
                    .summary("Explore the heroic heart of Andhra: 14th-century Kondaveedu hilltop fortress, sacred Kotappakonda Trikuta hill, subterranean Guthikonda caves, and Haailand theme resort.")
                    .description("The definitive Palnadu-Guntur corridor pass. Experience the 21-hairpin Kondaveedu ghat road, Dakshina Kashi limestone caves, 100-foot Prabhalu shrine, and world-class water park thrills with one seamless digital QR ticket. Valid for 3 days.")
                    .basePrice(new BigDecimal("865.00"))
                    .discountedCircuitPrice(new BigDecimal("699.00"))
                    .validityDays(3)
                    .bannerImage("/images/circuits/palnadu.jpg")
                    .featured(true)
                    .active(true)
                    .circuitPlaces(new ArrayList<>())
                    .build());

            addCircuitPlace(palnaduCircuit, kondaveeduFort, 1, 120, "21-hairpin ghat drive & 14th-century Reddy fort ramparts");
            addCircuitPlace(palnaduCircuit, kotappakonda, 2, 90, "Trikuta hill shrine, Koti Lingala parikrama & Prabhalu lore");
            addCircuitPlace(palnaduCircuit, guthikondaBilam, 3, 90, "Subterranean limestone cave exploration & Dakshina Kashi shrine");
            addCircuitPlace(palnaduCircuit, haailandResort, 4, 180, "Southeast Asian themed resort, wave pool & roller coaster rides");
        }

        // Demo Booking for tourist user if none exists
        if (bookingRepository.count() == 0) {
            Circuit vizagCircuit = circuitRepository.findBySlug("vizag-heritage-coastal-circuit").orElse(null);
            if (vizagCircuit != null) {
                BookingRequest demoBooking = new BookingRequest();
                demoBooking.setCircuitId(vizagCircuit.getId());
                demoBooking.setNumberOfTourists(2);
                demoBooking.setVisitStartDate(LocalDate.now());
                bookingService.createBooking("tourist@globetrotter.com", demoBooking);
            }
        }

        log.info("Andhra Pradesh & Telangana 59-District seed complete! {} circuits loaded across AP and Telangana.",
                circuitRepository.count());
    }

    private Place getOrCreatePlace(String name, String slug, String category, String state, String city,
                                   String description, Double lat, Double lng, String open, String close,
                                   BigDecimal price, String imgUrl, String addr) {
        return getOrCreatePlace(name, slug, category, state, city, description, lat, lng, open, close, price, imgUrl, addr,
                null, null, null, null, null, null);
    }

    private Place getOrCreatePlace(String name, String slug, String category, String state, String city,
                                   String description, Double lat, Double lng, String open, String close,
                                   BigDecimal price, String imgUrl, String addr,
                                   String bestStart, String bestEnd, String scenicTip,
                                   String crowdStart, String crowdEnd, Integer elevation) {
        return getOrCreatePlace(name, slug, category, state, city, description, lat, lng, open, close, price, imgUrl, addr,
                bestStart, bestEnd, scenicTip, crowdStart, crowdEnd, elevation,
                null, null, null, null, null, null, null);
    }

    private Place getOrCreatePlace(String name, String slug, String category, String state, String city,
                                   String description, Double lat, Double lng, String open, String close,
                                   BigDecimal price, String imgUrl, String addr,
                                   String bestStart, String bestEnd, String scenicTip,
                                   String crowdStart, String crowdEnd, Integer elevation,
                                   String lastMileType, BigDecimal lastMileCost, BigDecimal parkingFee,
                                   Double trekDistKm, String difficulty, String practicalGuide, BigDecimal totalCost) {
        return placeRepository.findBySlug(slug)
                .or(() -> placeRepository.findByNameIgnoreCase(name.trim()))
                .map(existing -> {
                    if (existing.getDistrict() == null || existing.getDistrict().isBlank()) {
                        existing.setDistrict(inferDistrict(city, state, name));
                    }
                    if (existing.getLatitude() == null && lat != null) existing.setLatitude(lat);
                    if (existing.getLongitude() == null && lng != null) existing.setLongitude(lng);
                    return placeRepository.save(existing);
                }).orElseGet(() -> placeRepository.save(Place.builder()
                .name(name)
                .slug(slug)
                .category(category)
                .state(state)
                .district(inferDistrict(city, state, name))
                .city(city)
                .description(description)
                .latitude(lat)
                .longitude(lng)
                .openingTime(open)
                .closingTime(close)
                .individualPrice(price)
                .imageUrl(imgUrl)
                .address(addr)
                .bestVisitingHoursStart(bestStart)
                .bestVisitingHoursEnd(bestEnd)
                .scenicTip(scenicTip)
                .crowdPeakStart(crowdStart)
                .crowdPeakEnd(crowdEnd)
                .elevationMeters(elevation)
                .lastMileTransitType(lastMileType)
                .lastMileCost(lastMileCost)
                .parkingFee(parkingFee)
                .trekDistanceKm(trekDistKm)
                .physicalDifficulty(difficulty)
                .practicalAccessGuide(practicalGuide)
                .totalEstimatedCost(totalCost)
                .active(true)
                .build()));
    }

    private String inferDistrict(String city, String state, String name) {
        String c = ((city != null ? city : "") + " " + (name != null ? name : "")).toLowerCase();
        if (c.contains("visakhapatnam") || c.contains("vizag") || c.contains("rushikonda") || c.contains("kailasagiri")) return "Visakhapatnam District";
        if (c.contains("araku") || c.contains("borra") || c.contains("katiki") || c.contains("padmapuram") || c.contains("paderu") || c.contains("maredumilli")) return "Alluri Sitharama Raju (ASR) District";
        if (c.contains("tirupati") || c.contains("chandragiri") || c.contains("kapila theertham") || c.contains("silathoranam")) return "Tirupati District";
        if (c.contains("hyderabad") || c.contains("charminar") || c.contains("golconda") || c.contains("salar jung") || c.contains("chowmahalla")) return "Hyderabad District";
        if (c.contains("ramappa") || c.contains("mulugu")) return "Mulugu District";
        if (c.contains("warangal") || c.contains("thousand pillar") || c.contains("hanumakonda")) return "Hanumakonda District";
        if (c.contains("kuntala") || c.contains("adilabad") || c.contains("pochera")) return "Adilabad District";
        if (c.contains("belum") || c.contains("kurnool") || c.contains("yaganti") || c.contains("orvakal")) return "Nandyal District";
        if (c.contains("gandikota") || c.contains("kadapa") || c.contains("vontimitta")) return "YSR Kadapa District";
        if (c.contains("kondapalli") || c.contains("vijayawada")) return "NTR District";
        if (c.contains("nagarjuna") || c.contains("palnadu") || c.contains("macherla")) return "Palnadu District";
        if (city != null && !city.isBlank()) {
            return city.endsWith("District") ? city : city + " District";
        }
        return state != null && state.equalsIgnoreCase("Telangana") ? "Hyderabad District" : "Visakhapatnam District";
    }

    private void addCircuitPlace(Circuit circuit, Place place, int seq, int duration, String transit) {
        if (circuit.getId() != null && place.getId() != null) {
            boolean exists = circuitPlaceRepository.existsByCircuitIdAndPlaceId(circuit.getId(), place.getId());
            if (exists) return;
        }
        circuitPlaceRepository.save(CircuitPlace.builder()
                .circuit(circuit)
                .place(place)
                .sequenceOrder(seq)
                .estimatedDurationMins(duration)
                .transitNote(transit)
                .build());
    }
}

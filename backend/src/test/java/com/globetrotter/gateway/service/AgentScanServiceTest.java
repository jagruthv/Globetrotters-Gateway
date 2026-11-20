package com.globetrotter.gateway.service;

import com.globetrotter.gateway.model.*;
import com.globetrotter.gateway.payload.*;
import com.globetrotter.gateway.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class AgentScanServiceTest {

    @Autowired
    private AgentScanService agentScanService;

    @Autowired
    private QrSignatureService qrSignatureService;

    @Autowired
    private CircuitPassService circuitPassService;

    @Autowired
    private CircuitPassRepository circuitPassRepository;

    @Autowired
    private PassLocationRepository passLocationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PlaceRepository placeRepository;

    private User tourist;
    private User agent;
    private Place placeBorra;
    private Place placeAraku;

    @BeforeEach
    void setUp() {
        placeBorra = placeRepository.save(Place.builder()
                .name("Borra Caves Unit Test")
                .slug("borra-caves-unit-" + System.nanoTime())
                .individualPrice(new BigDecimal("150.00"))
                .state("Andhra Pradesh")
                .city("Araku Valley")
                .build());

        placeAraku = placeRepository.save(Place.builder()
                .name("Araku Tribal Museum Unit Test")
                .slug("araku-museum-unit-" + System.nanoTime())
                .individualPrice(new BigDecimal("50.00"))
                .state("Andhra Pradesh")
                .city("Araku Valley")
                .build());

        tourist = userRepository.save(User.builder()
                .email("tourist-unit-" + System.nanoTime() + "@test.com")
                .fullName("Pass Explorer")
                .role(Role.ROLE_TOURIST)
                .build());

        agent = userRepository.save(User.builder()
                .email("agent-unit-" + System.nanoTime() + "@test.com")
                .fullName("Gate Inspector Borra")
                .role(Role.ROLE_AGENT)
                .assignedLocation(placeBorra)
                .build());
    }

    @Test
    @DisplayName("Single pass issuance across multiple locations creates constant-size QR and verifies independently")
    void testPassIssuanceAndMultiLocationVerification() {
        Instant validFrom = Instant.now().minus(1, ChronoUnit.HOURS);
        Instant validUntil = Instant.now().plus(48, ChronoUnit.HOURS);

        PassCreateRequest createReq = PassCreateRequest.builder()
                .validFrom(validFrom)
                .validUntil(validUntil)
                .locations(List.of(
                        PassLocationItemDTO.builder().locationId(placeBorra.getId()).guestCount(3).build(),
                        PassLocationItemDTO.builder().locationId(placeAraku.getId()).guestCount(3).build()
                ))
                .build();

        CircuitPassResponse issued = circuitPassService.issuePass(tourist.getId(), createReq);
        assertNotNull(issued);
        assertNotNull(issued.getQrPayload());
        assertEquals(2, issued.getLocations().size());

        // 1. Scan at Borra Caves (Agent is assigned to Borra)
        AgentScanRequest scanBorra = AgentScanRequest.builder()
                .qrPayload(issued.getQrPayload())
                .locationId(placeBorra.getId())
                .build();
        AgentScanResponse resBorra = agentScanService.verifyAndRedeem(scanBorra, agent);
        assertEquals("SUCCESS", resBorra.getStatus());
        assertEquals(3, resBorra.getGuestCount());

        // 2. Immediate Re-scan at Borra Caves should return ALREADY_REDEEMED
        AgentScanResponse resBorraDuplicate = agentScanService.verifyAndRedeem(scanBorra, agent);
        assertEquals("ALREADY_REDEEMED", resBorraDuplicate.getStatus());

        // 3. Scan at unbooked place should return NOT_BOOKED_HERE
        Place unbookedPlace = placeRepository.save(Place.builder()
                .name("Unbooked Fort")
                .slug("unbooked-fort-" + System.nanoTime())
                .individualPrice(new BigDecimal("40.00"))
                .state("Telangana")
                .city("Hyderabad")
                .build());

        User unbookedAgent = userRepository.save(User.builder()
                .email("unbooked-agent-" + System.nanoTime() + "@test.com")
                .fullName("Fort Agent")
                .role(Role.ROLE_AGENT)
                .assignedLocation(unbookedPlace)
                .build());

        AgentScanRequest scanUnbooked = AgentScanRequest.builder()
                .qrPayload(issued.getQrPayload())
                .locationId(unbookedPlace.getId())
                .build();
        AgentScanResponse resUnbooked = agentScanService.verifyAndRedeem(scanUnbooked, unbookedAgent);
        assertEquals("NOT_BOOKED_HERE", resUnbooked.getStatus());
    }

    @Test
    @DisplayName("Manifest sync returns only active unused passes for agent's assigned location")
    void testManifestSync() {
        Instant validFrom = Instant.now().minus(1, ChronoUnit.HOURS);
        Instant validUntil = Instant.now().plus(24, ChronoUnit.HOURS);

        PassCreateRequest createReq = PassCreateRequest.builder()
                .validFrom(validFrom)
                .validUntil(validUntil)
                .locations(List.of(
                        PassLocationItemDTO.builder().locationId(placeBorra.getId()).guestCount(4).build()
                ))
                .build();

        CircuitPassResponse pass = circuitPassService.issuePass(tourist.getId(), createReq);

        SyncManifestResponse manifest = agentScanService.getManifest(agent, null);
        assertNotNull(manifest);
        assertEquals(placeBorra.getId(), manifest.getLocationId());
        assertTrue(manifest.getPasses().stream().anyMatch(p -> p.getPassId().equals(pass.getPassId())));
    }
}

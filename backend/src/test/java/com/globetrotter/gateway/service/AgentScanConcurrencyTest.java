package com.globetrotter.gateway.service;

import com.globetrotter.gateway.model.*;
import com.globetrotter.gateway.payload.AgentScanRequest;
import com.globetrotter.gateway.payload.AgentScanResponse;
import com.globetrotter.gateway.repository.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class AgentScanConcurrencyTest {

    @Autowired
    private AgentScanService agentScanService;

    @Autowired
    private QrSignatureService qrSignatureService;

    @Autowired
    private CircuitPassRepository circuitPassRepository;

    @Autowired
    private PassLocationRepository passLocationRepository;

    @Autowired
    private ScanAuditLogRepository scanAuditLogRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PlaceRepository placeRepository;

    @Test
    @DisplayName("Concurrency Test: Two simultaneous scans of the exact same pass at the exact same millisecond results in exactly 1 SUCCESS and 1 ALREADY_REDEEMED")
    void testConcurrentScansPreventDoubleRedemption() throws Exception {
        // 1. Setup Place
        Place place = placeRepository.save(Place.builder()
                .name("Borra Caves Gate Test")
                .slug("borra-caves-gate-test-" + System.currentTimeMillis())
                .category("Nature")
                .state("Andhra Pradesh")
                .city("Araku Valley")
                .individualPrice(new BigDecimal("150.00"))
                .build());

        // 2. Setup Tourist User
        User tourist = userRepository.save(User.builder()
                .email("tourist-concurrent-" + System.currentTimeMillis() + "@test.com")
                .fullName("Concurrent Tourist")
                .role(Role.ROLE_TOURIST)
                .build());

        // 3. Setup Agent User assigned to this Place
        User agent = userRepository.save(User.builder()
                .email("agent-concurrent-" + System.currentTimeMillis() + "@test.com")
                .fullName("Gate Officer Concurrent")
                .role(Role.ROLE_STAFF)
                .assignedLocation(place)
                .build());

        // 4. Setup CircuitPass and PassLocation
        String passId = qrSignatureService.generatePassId();
        Instant validFrom = Instant.now().minus(1, ChronoUnit.HOURS);
        Instant validUntil = Instant.now().plus(24, ChronoUnit.HOURS);

        CircuitPass circuitPass = circuitPassRepository.save(CircuitPass.builder()
                .passId(passId)
                .user(tourist)
                .validFrom(validFrom)
                .validUntil(validUntil)
                .status("ACTIVE")
                .build());

        PassLocation passLocation = passLocationRepository.save(PassLocation.builder()
                .pass(circuitPass)
                .location(place)
                .guestCount(2)
                .status("UNUSED")
                .build());

        // 5. Generate signed QR payload
        String qrPayload = qrSignatureService.generateQrPayload(passId, validUntil);

        // 6. Concurrency Barrier Setup
        int numberOfThreads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(numberOfThreads);
        CyclicBarrier barrier = new CyclicBarrier(numberOfThreads);
        List<AgentScanResponse> responses = Collections.synchronizedList(new ArrayList<>());

        Callable<AgentScanResponse> scanTask = () -> {
            // Await both threads to synchronize at the starting line
            barrier.await(5, TimeUnit.SECONDS);

            AgentScanRequest request = AgentScanRequest.builder()
                    .qrPayload(qrPayload)
                    .locationId(place.getId())
                    .deviceTerminalId("TURNSTILE-GATE-ALPHA")
                    .build();

            return agentScanService.verifyAndRedeem(request, agent);
        };

        Future<AgentScanResponse> future1 = executor.submit(scanTask);
        Future<AgentScanResponse> future2 = executor.submit(scanTask);

        responses.add(future1.get(10, TimeUnit.SECONDS));
        responses.add(future2.get(10, TimeUnit.SECONDS));
        executor.shutdown();

        // 7. Assertions
        long successCount = responses.stream().filter(r -> "SUCCESS".equals(r.getStatus())).count();
        long alreadyRedeemedCount = responses.stream().filter(r -> "ALREADY_REDEEMED".equals(r.getStatus())).count();

        assertEquals(1, successCount, "Exactly one thread must succeed and receive status SUCCESS");
        assertEquals(1, alreadyRedeemedCount, "The conflicting simultaneous scan must be rejected with status ALREADY_REDEEMED");

        // 8. Verify database state
        PassLocation updatedLoc = passLocationRepository.findById(passLocation.getId()).orElseThrow();
        assertEquals("REDEEMED", updatedLoc.getStatus(), "Database status must be atomically transitioned to REDEEMED");
        assertNotNull(updatedLoc.getRedeemedAt(), "Redeemed timestamp must be populated");
        assertEquals(agent.getId(), updatedLoc.getRedeemedByAgent().getId(), "Redeemed agent ID must match");

        // 9. Verify audit logs
        List<ScanAuditLog> auditLogs = scanAuditLogRepository.findByPassIdOrderByScannedAtDesc(passId);
        assertTrue(auditLogs.stream().anyMatch(l -> "SUCCESS".equals(l.getResult())), "Audit log must contain SUCCESS");
        assertTrue(auditLogs.stream().anyMatch(l -> "ALREADY_REDEEMED".equals(l.getResult())), "Audit log must contain ALREADY_REDEEMED");
    }
}

package com.globetrotter.gateway.service;

import com.globetrotter.gateway.model.*;
import com.globetrotter.gateway.payload.*;
import com.globetrotter.gateway.repository.CircuitPassRepository;
import com.globetrotter.gateway.repository.PassLocationRepository;
import com.globetrotter.gateway.repository.PlaceRepository;
import com.globetrotter.gateway.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CircuitPassService {

    private final CircuitPassRepository circuitPassRepository;
    private final PassLocationRepository passLocationRepository;
    private final PlaceRepository placeRepository;
    private final UserRepository userRepository;
    private final QrSignatureService qrSignatureService;

    @Transactional
    public CircuitPassResponse issuePass(Long userId, PassCreateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        Instant validFrom = request.getValidFrom() != null ? request.getValidFrom() : Instant.now();
        Instant validUntil = request.getValidUntil();
        if (validUntil.isBefore(validFrom)) {
            throw new IllegalArgumentException("validUntil must be after validFrom");
        }

        String passId = qrSignatureService.generatePassId();
        String qrPayload = qrSignatureService.generateQrPayload(passId, validUntil);

        CircuitPass circuitPass = CircuitPass.builder()
                .passId(passId)
                .user(user)
                .validFrom(validFrom)
                .validUntil(validUntil)
                .status("ACTIVE")
                .createdAt(Instant.now())
                .locations(new ArrayList<>())
                .build();

        List<PassLocation> passLocations = new ArrayList<>();
        for (PassLocationItemDTO item : request.getLocations()) {
            Place place = placeRepository.findById(item.getLocationId())
                    .orElseThrow(() -> new IllegalArgumentException("Location not found with id: " + item.getLocationId()));

            PassLocation passLocation = PassLocation.builder()
                    .pass(circuitPass)
                    .location(place)
                    .guestCount(item.getGuestCount() > 0 ? item.getGuestCount() : 1)
                    .status("UNUSED")
                    .build();
            passLocations.add(passLocation);
            circuitPass.getLocations().add(passLocation);
        }

        CircuitPass savedPass = circuitPassRepository.save(circuitPass);

        log.info("Circuit pass issued: passId={}, user={}, locationsCount={}",
                passId, user.getEmail(), circuitPass.getLocations().size());

        return mapToResponse(savedPass, qrPayload);
    }

    @Transactional
    public CircuitPass createCircuitPassForBooking(Booking booking) {
        Instant validFrom = booking.getVisitStartDate()
                .atStartOfDay(ZoneId.systemDefault())
                .toInstant();
        Instant validUntil = booking.getVisitEndDate()
                .plusDays(1)
                .atStartOfDay(ZoneId.systemDefault())
                .toInstant();

        String passId = qrSignatureService.generatePassId();
        String qrPayload = qrSignatureService.generateQrPayload(passId, validUntil);

        CircuitPass circuitPass = CircuitPass.builder()
                .passId(passId)
                .user(booking.getUser())
                .validFrom(validFrom)
                .validUntil(validUntil)
                .status("ACTIVE")
                .createdAt(Instant.now())
                .locations(new ArrayList<>())
                .build();

        int guestCount = booking.getNumberOfTourists() != null && booking.getNumberOfTourists() > 0
                ? booking.getNumberOfTourists()
                : 1;

        List<PassLocation> passLocations = new ArrayList<>();
        if (booking.getCircuit() != null && booking.getCircuit().getCircuitPlaces() != null) {
            for (CircuitPlace cp : booking.getCircuit().getCircuitPlaces()) {
                PassLocation pl = PassLocation.builder()
                        .pass(circuitPass)
                        .location(cp.getPlace())
                        .guestCount(guestCount)
                        .status("UNUSED")
                        .build();
                passLocations.add(pl);
                circuitPass.getLocations().add(pl);
            }
        }

        CircuitPass saved = circuitPassRepository.save(circuitPass);

        booking.setQrPassToken(qrPayload);
        log.info("Created linked CircuitPass {} with {} locations for booking {}",
                passId, circuitPass.getLocations().size(), booking.getBookingReference());

        return saved;
    }

    @Transactional(readOnly = true)
    public CircuitPassResponse getPassByPassId(String passId) {
        CircuitPass pass = circuitPassRepository.findByPassIdWithLocations(passId)
                .orElseThrow(() -> new IllegalArgumentException("Circuit pass not found: " + passId));

        String qrPayload = qrSignatureService.generateQrPayload(pass.getPassId(), pass.getValidUntil());
        return mapToResponse(pass, qrPayload);
    }

    @Transactional(readOnly = true)
    public List<CircuitPassResponse> getPassesForUser(Long userId) {
        List<CircuitPass> passes = circuitPassRepository.findByUser_IdOrderByCreatedAtDesc(userId);
        return passes.stream()
                .map(p -> mapToResponse(p, qrSignatureService.generateQrPayload(p.getPassId(), p.getValidUntil())))
                .collect(Collectors.toList());
    }

    private CircuitPassResponse mapToResponse(CircuitPass pass, String qrPayload) {
        List<PassLocationResponseDTO> locDTOs = pass.getLocations().stream()
                .map(loc -> PassLocationResponseDTO.builder()
                        .id(loc.getId())
                        .locationId(loc.getLocation().getId())
                        .locationName(loc.getLocation().getName())
                        .guestCount(loc.getGuestCount())
                        .status(loc.getStatus())
                        .redeemedAt(loc.getRedeemedAt())
                        .build())
                .collect(Collectors.toList());

        return CircuitPassResponse.builder()
                .passId(pass.getPassId())
                .qrPayload(qrPayload)
                .validFrom(pass.getValidFrom())
                .validUntil(pass.getValidUntil())
                .status(pass.getStatus())
                .touristName(pass.getUser() != null ? pass.getUser().getFullName() : "Tourist")
                .touristEmail(pass.getUser() != null ? pass.getUser().getEmail() : null)
                .locations(locDTOs)
                .build();
    }
}

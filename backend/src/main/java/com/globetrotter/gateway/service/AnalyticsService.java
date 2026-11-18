package com.globetrotter.gateway.service;

import com.globetrotter.gateway.model.TicketRedemption;
import com.globetrotter.gateway.payload.AnalyticsSummaryDTO;
import com.globetrotter.gateway.repository.BookingRepository;
import com.globetrotter.gateway.repository.CircuitRepository;
import com.globetrotter.gateway.repository.PlaceRepository;
import com.globetrotter.gateway.repository.TicketRedemptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final BookingRepository bookingRepository;
    private final TicketRedemptionRepository redemptionRepository;
    private final CircuitRepository circuitRepository;
    private final PlaceRepository placeRepository;

    @Transactional(readOnly = true)
    public AnalyticsSummaryDTO getAnalyticsSummary() {
        long totalBookings = bookingRepository.countTotalBookings();
        long totalCheckIns = redemptionRepository.countTotalCheckIns();
        long totalCircuits = circuitRepository.count();
        long totalPlaces = placeRepository.count();
        BigDecimal totalRevenue = bookingRepository.calculateTotalRevenue();

        LocalDateTime startOfToday = LocalDate.now().atStartOfDay();
        long activeTouristsToday = redemptionRepository.countCheckInsSince(startOfToday);

        // Place popularity
        List<Object[]> popularityData = redemptionRepository.findCheckInsByPlace();
        List<AnalyticsSummaryDTO.PlaceCheckInStat> stats = new ArrayList<>();
        for (Object[] row : popularityData) {
            String placeName = (String) row[0];
            long count = ((Number) row[1]).longValue();
            stats.add(new AnalyticsSummaryDTO.PlaceCheckInStat(placeName, count));
        }

        // Recent check-ins — single query eager-fetch (replaces 31 N+1 queries)
        List<TicketRedemption> recent = redemptionRepository.findRecentCheckInsWithDetails(PageRequest.of(0, 10));

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("hh:mm a, dd MMM");
        List<AnalyticsSummaryDTO.RecentCheckInDTO> recentCheckIns = recent.stream()
                .filter(r -> r.getCheckedInAt() != null)
                .map(r -> AnalyticsSummaryDTO.RecentCheckInDTO.builder()
                        .touristName(r.getBooking().getUser().getFullName())
                        .circuitTitle(r.getBooking().getCircuit().getTitle())
                        .placeName(r.getPlace().getName())
                        .timestamp(r.getCheckedInAt().format(formatter))
                        .gateTerminal(r.getGateTerminalId())
                        .build())
                .collect(Collectors.toList());

        return AnalyticsSummaryDTO.builder()
                .totalBookings(totalBookings)
                .totalCheckIns(totalCheckIns)
                .activeTouristsToday(activeTouristsToday)
                .totalRevenue(totalRevenue != null ? totalRevenue : BigDecimal.ZERO)
                .totalCircuits(totalCircuits)
                .totalPlaces(totalPlaces)
                .placePopularity(stats)
                .recentCheckIns(recentCheckIns)
                .build();
    }

    @Transactional(readOnly = true)
    public String generateDailyReportCsv() {
        StringBuilder csv = new StringBuilder();
        // RFC 4180 compliant CSV header for Tourism Officers
        csv.append("Redemption_ID,Booking_Reference,Tourist_Name,Circuit_Name,Destination_Place,CheckIn_Timestamp,Gate_Terminal,Pass_Status\n");

        List<TicketRedemption> allRedemptions = redemptionRepository.findAll(Sort.by(Sort.Direction.DESC, "checkedInAt"));
        DateTimeFormatter isoFormat = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

        for (TicketRedemption r : allRedemptions) {
            if (r.getBooking() == null || r.getPlace() == null) continue;

            String ref = escapeCsv(r.getBooking().getBookingReference());
            String tourist = escapeCsv(r.getBooking().getUser() != null ? r.getBooking().getUser().getFullName() : "Verified Tourist");
            String circuit = escapeCsv(r.getBooking().getCircuit() != null ? r.getBooking().getCircuit().getTitle() : "Regional Pass");
            String place = escapeCsv(r.getPlace().getName());
            String time = r.getCheckedInAt() != null ? r.getCheckedInAt().format(isoFormat) : "PENDING";
            String terminal = escapeCsv(r.getGateTerminalId() != null ? r.getGateTerminalId() : "Turnstile-Primary");
            String status = r.getStatus() != null ? r.getStatus() : "PENDING";

            csv.append(r.getId()).append(",")
               .append(ref).append(",")
               .append(tourist).append(",")
               .append(circuit).append(",")
               .append(place).append(",")
               .append(time).append(",")
               .append(terminal).append(",")
               .append(status).append("\n");
        }
        return csv.toString();
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}

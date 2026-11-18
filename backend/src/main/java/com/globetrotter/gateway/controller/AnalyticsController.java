package com.globetrotter.gateway.controller;

import com.globetrotter.gateway.payload.AnalyticsSummaryDTO;
import com.globetrotter.gateway.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/analytics")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AnalyticsSummaryDTO> getAnalytics() {
        return ResponseEntity.ok(analyticsService.getAnalyticsSummary());
    }

    @GetMapping(value = "/analytics/export-csv", produces = "text/csv")
    public ResponseEntity<byte[]> exportDailyReportCsv() {
        String csv = analyticsService.generateDailyReportCsv();
        String filename = "globetrotter_daily_tourism_report_" + LocalDate.now() + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .header(HttpHeaders.CONTENT_TYPE, "text/csv; charset=UTF-8")
                .body(csv.getBytes(StandardCharsets.UTF_8));
    }
}

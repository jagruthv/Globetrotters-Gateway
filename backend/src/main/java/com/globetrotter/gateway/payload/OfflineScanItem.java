package com.globetrotter.gateway.payload;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OfflineScanItem {

    private String qrPayload;
    private Long locationId;
    private Instant scannedAt;
    private String terminalId;
}

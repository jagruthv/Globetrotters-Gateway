package com.globetrotter.gateway.payload;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OfflineSyncResponse {

    private int totalProcessed;
    private int successCount;
    private int rejectedCount;
    private List<AgentScanResponse> results;
}

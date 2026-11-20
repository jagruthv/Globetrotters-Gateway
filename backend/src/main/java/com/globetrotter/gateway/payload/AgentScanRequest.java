package com.globetrotter.gateway.payload;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentScanRequest {

    @NotBlank(message = "qrPayload is required")
    private String qrPayload;

    private Long locationId;

    private String deviceTerminalId;
}

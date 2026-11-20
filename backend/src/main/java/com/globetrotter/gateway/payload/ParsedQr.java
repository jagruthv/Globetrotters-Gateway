package com.globetrotter.gateway.payload;

import java.time.Instant;

public record ParsedQr(
        String passId,
        Instant validUntil,
        long expiryEpochSec
) {
    public ParsedQr(String passId, Instant validUntil) {
        this(passId, validUntil, validUntil.getEpochSecond());
    }
}

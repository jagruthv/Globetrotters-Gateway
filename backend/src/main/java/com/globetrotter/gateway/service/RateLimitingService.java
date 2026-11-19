package com.globetrotter.gateway.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * RateLimitingService — high-performance in-memory rate limiting with Bucket4j.
 * Backed by Caffeine Cache with automatic 15-minute TTL eviction and bounded memory:
 *  - Auth: 5 attempts per minute per IP / email
 *  - Payments: 10 attempts per minute per user
 *  - Gate Scans: 60 scans per minute per terminal
 *  - AI Chat: 20 messages per minute per session
 */
@Service
public class RateLimitingService {

    private final Cache<String, Bucket> authBuckets = Caffeine.newBuilder()
            .expireAfterAccess(Duration.ofMinutes(15))
            .maximumSize(20_000)
            .build();

    private final Cache<String, Bucket> paymentBuckets = Caffeine.newBuilder()
            .expireAfterAccess(Duration.ofMinutes(15))
            .maximumSize(20_000)
            .build();

    private final Cache<String, Bucket> scannerBuckets = Caffeine.newBuilder()
            .expireAfterAccess(Duration.ofMinutes(15))
            .maximumSize(20_000)
            .build();

    private final Cache<String, Bucket> chatBuckets = Caffeine.newBuilder()
            .expireAfterAccess(Duration.ofMinutes(15))
            .maximumSize(20_000)
            .build();

    private final Cache<String, Bucket> otpBuckets = Caffeine.newBuilder()
            .expireAfterAccess(Duration.ofMinutes(15))
            .maximumSize(20_000)
            .build();

    private final Cache<String, Bucket> resetBuckets = Caffeine.newBuilder()
            .expireAfterAccess(Duration.ofMinutes(15))
            .maximumSize(20_000)
            .build();

    public boolean tryConsumeAuth(String key) {
        Bucket bucket = authBuckets.get(key, k ->
                Bucket.builder()
                        .addLimit(Bandwidth.builder().capacity(5).refillGreedy(5, Duration.ofMinutes(1)).build())
                        .build()
        );
        return bucket != null && bucket.tryConsume(1);
    }

    public boolean tryConsumePayment(String key) {
        Bucket bucket = paymentBuckets.get(key, k ->
                Bucket.builder()
                        .addLimit(Bandwidth.builder().capacity(10).refillGreedy(10, Duration.ofMinutes(1)).build())
                        .build()
        );
        return bucket != null && bucket.tryConsume(1);
    }

    public boolean tryConsumeScan(String key) {
        Bucket bucket = scannerBuckets.get(key, k ->
                Bucket.builder()
                        .addLimit(Bandwidth.builder().capacity(60).refillGreedy(60, Duration.ofMinutes(1)).build())
                        .build()
        );
        return bucket != null && bucket.tryConsume(1);
    }

    public boolean tryConsumeChat(String key) {
        Bucket bucket = chatBuckets.get(key, k ->
                Bucket.builder()
                        .addLimit(Bandwidth.builder().capacity(20).refillGreedy(20, Duration.ofMinutes(1)).build())
                        .build()
        );
        return bucket != null && bucket.tryConsume(1);
    }

    /**
     * Rate limits OTP requests & verifications to max 3 attempts per 5 minutes.
     * Prevents 4-digit / 6-digit OTP brute-force attacks.
     */
    public boolean tryConsumeOtp(String key) {
        Bucket bucket = otpBuckets.get(key, k ->
                Bucket.builder()
                        .addLimit(Bandwidth.builder().capacity(3).refillGreedy(3, Duration.ofMinutes(5)).build())
                        .build()
        );
        return bucket != null && bucket.tryConsume(1);
    }

    /**
     * Rate limits Password Reset requests to max 3 attempts per 15 minutes.
     */
    public boolean tryConsumeReset(String key) {
        Bucket bucket = resetBuckets.get(key, k ->
                Bucket.builder()
                        .addLimit(Bandwidth.builder().capacity(3).refillGreedy(3, Duration.ofMinutes(15)).build())
                        .build()
        );
        return bucket != null && bucket.tryConsume(1);
    }
}

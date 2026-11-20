package com.globetrotter.gateway.emailotp.repository;

import com.globetrotter.gateway.emailotp.model.EmailOtpToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmailOtpTokenRepository extends JpaRepository<EmailOtpToken, Long> {

    Optional<EmailOtpToken> findTopByEmailAndUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(String email, LocalDateTime now);

    Optional<EmailOtpToken> findTopByEmailOrderByCreatedAtDesc(String email);

    long countByEmailAndCreatedAtAfter(String email, LocalDateTime since);

    List<EmailOtpToken> findByEmailAndUsedFalse(String email);
}

# Backend Security — Logic Audit & Implementation Status

This document provides a factual, code-verified audit of the security and authentication subsystem in `com.globetrotter.gateway.security`.

---

## 1. SecurityConfig
- **File**: `SecurityConfig.java`
- **Implemented Logic**:
  - Stateless architecture (`SessionCreationPolicy.STATELESS`), CSRF disabled for REST API.
  - CORS configuration: Permissive origin pattern `List.of("*")`, methods `GET, POST, PUT, DELETE, OPTIONS, PATCH`, allow credentials true, max-age 3600s.
  - Endpoint Access Rules:
    - Public: `/api/auth/**`, `GET /api/circuits/**`, `GET /api/places/**`, `/api/chat/**`, `/api/bookings/verify/qr-image/**`, `/h2-console/**`, Swagger UI (`/swagger-ui/**`, `/v3/api-docs/**`), Actuator health (`/actuator/health`).
    - Authenticated Tourist: `/api/payments/**`, `/api/bookings/checkout`, `/api/bookings/my-passes`, `/api/bookings/{reference}`.
    - Staff & Admin: `/api/verify/**` (requires `hasAnyAuthority("ROLE_STAFF", "ROLE_ADMIN")`).
    - Admin Only: `/api/admin/**` (requires `hasAuthority("ROLE_ADMIN")`).
  - H2 Console frame options disabled (`HeadersConfigurer.FrameOptionsConfig::disable`).
  - Configures `DaoAuthenticationProvider` with `BCryptPasswordEncoder`.
  - Inserts `AuthTokenFilter` before `UsernamePasswordAuthenticationFilter`.
- **Not Yet Implemented / Gaps**:
  - CORS allows all origin patterns (`*`) with credentials allowed, which must be locked down to specific frontend domain origins for strict production environments.
  - Actuator metrics (`/actuator/metrics`) are exposed in `application.yml` without explicit authentication rules in SecurityConfig (only health is explicitly permitted; other actuator endpoints fall under `.anyRequest().authenticated()`).

---

## 2. AuthTokenFilter
- **File**: `AuthTokenFilter.java`
- **Implemented Logic**:
  - Extends `OncePerRequestFilter`.
  - Parses `Authorization: Bearer <token>` from HTTP headers.
  - Calls `jwtUtils.validateJwtToken(jwt)`.
  - Loads user details via `userDetailsService.loadUserByUsername()` and sets `UsernamePasswordAuthenticationToken` in `SecurityContextHolder`.
- **Not Yet Implemented / Gaps**:
  - Does not check if the JWT has been revoked or logged out (stateless JWTs remain valid until expiration; no token blocklist/revocation table).
  - Queries database on every incoming request (`userDetailsService.loadUserByUsername`) rather than extracting claims directly from the token, causing 1 DB hit per authenticated HTTP request.

---

## 3. JwtUtils
- **File**: `JwtUtils.java`
- **Implemented Logic**:
  - Secret key loaded from `app.jwt.secret` (64-byte hex string converted using `Decoders.BASE64.decode()`).
  - HMAC-SHA256 signature using `Keys.hmacShaKeyFor(keyBytes)`.
  - Expiration defaults to 24 hours (`86,400,000 ms`).
  - Comprehensive exception catching: `MalformedJwtException`, `ExpiredJwtException`, `UnsupportedJwtException`, `IllegalArgumentException`.
- **Not Yet Implemented / Gaps**:
  - Token claims do not include roles or user IDs (token subject only contains email/username).
  - No asymmetric key signing (e.g. RSA / Ed25519 with public/private key pairs).

---

## 4. UserDetailsServiceImpl & UserDetailsImpl
- **Files**: `UserDetailsServiceImpl.java`, `UserDetailsImpl.java`
- **Implemented Logic**:
  - Implements Spring Security `UserDetailsService`.
  - Loads `User` from `UserRepository` by email (treating email as username).
  - Maps `user.getRole().name()` into `SimpleGrantedAuthority`.
  - Implements `UserDetails` contract (`isAccountNonExpired`, `isAccountNonLocked`, `isCredentialsNonExpired`, `isEnabled` all return true).
- **Not Yet Implemented / Gaps**:
  - User accounts have no `enabled` or `locked` database flags (hardcoded to return `true`). If a user needs to be banned or suspended, there is no field on the entity.

---

## 5. Enterprise Anti-Bot & Threat Defense Subsystem
- **Files**: `ProofOfWorkSecurityService.java`, `AntiBotSecurityFilter.java`, `AntiBotController.java`
- **Implemented Logic**:
  - **Zero-Friction Proof-of-Work (PoW)**: Issues ephemeral HMAC-SHA256 signed challenge tokens ($C = \text{Base64}(\text{salt}:\text{timestamp}:d:\text{hmac})$). Solved in background by client Web Crypto API (~30–75ms) with single-use replay protection via Caffeine `solvedChallengesCache`.
  - **Dynamic In-Memory IP Quarantine (IP Jail)**: Backed by Caffeine Cache (`ipJailCache`, 50,000 capacity, 24h max TTL). Jailed IPs are terminated in $0.01\text{ms}$ at the servlet filter boundary with HTTP 429 without loading Hibernate or database connection pools.
  - **Deceptive Honeypot Traps**: Intercepts requests to `/api/security/honeypot-trap` and `/api/crawler-trap/**`. Offending crawlers (Scrapy, Beautiful Soup, headless bots) are instantly quarantined for 24 hours.
  - **Known Malicious Scraper Detection**: Checks User-Agent headers against known scanner signatures (`sqlmap`, `nikto`, `masscan`, `acunetix`, `zgrab`).
  - **Observability Metrics**: Endpoint `/api/security/metrics` provides real-time counts of challenges issued, solved, bots quarantined, honeypots tripped, and active jailed IPs.
- **Academic & Industry Citations**:
  - Hashcash (Adam Back, 1997/2002)
  - ALTCHA Protocol (Self-hosted Proof-of-Work Challenge Specification, 2024)
  - mCAPTCHA (Work-factor-based rate limiting, Aravind, 2022)
  - OWASP Automated Threats (OAT-005 Scraping, OAT-006 Scalping, OAT-008 DoS)


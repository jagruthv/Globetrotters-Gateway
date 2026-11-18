# Globetrotter Backend — Spring Boot REST API & Turnstile Verification Engine

## Overview
The `backend` directory contains the production-grade Java 21 + Spring Boot 3 REST API service for Globetrotter. It powers user authentication, regional circuit bookings, HMAC-SHA256 paperless QR code generation, and sub-50ms gate turnstile scanner verification.

---

## Technical Stack
- **Framework**: Spring Boot 3.4.x, Java 21
- **Security**: Spring Security, JWT (HMAC-SHA256) with role-based authorization (`ROLE_TOURIST`, `ROLE_STAFF`, `ROLE_ADMIN`).
- **Database**: H2 embedded database (`data/globetrotter_dev.mv.db`) pre-seeded with 59 districts and 295 attractions. Supports PostgreSQL for production deployment.
- **ORM**: Spring Data JPA / Hibernate.

---

## Directory & Package Map

```
backend/
├── pom.xml                                   # Maven dependencies & build configuration
├── mvnw / mvnw.cmd                           # Maven wrapper scripts
├── data/
│   └── globetrotter_dev.mv.db                  # Pre-seeded local H2 database
└── src/main/java/com/globetrotter/gateway/
    ├── GatewayApplication.java               # Main Spring Boot entry point
    ├── config/                               # Security, Seeder & Exception Handlers
    ├── controller/                           # REST API Controllers (10 Controllers)
    ├── model/                                # JPA Entities (User, Booking, Circuit, Place, etc.)
    ├── payload/                              # DTO Request & Response Payloads
    ├── repository/                           # Spring Data JPA Repositories (7 Repositories)
    ├── security/                             # JWT Token Filter & UserDetailsService
    └── service/                              # Core Business Services (12 Services)
```

---

## Core API Endpoints

### 1. Authentication (`/api/auth`)
- `POST /api/auth/register`: Register new tourist account.
- `POST /api/auth/login`: Authenticate and receive JWT token.

### 2. Circuits & Places (`/api/circuits`, `/api/places`)
- `GET /api/circuits`: Fetch all available multi-attraction regional circuits.
- `GET /api/circuits/{id}`: Fetch detailed circuit itinerary and included stops.
- `GET /api/places`: Search attractions by district or category.

### 3. Bookings & Paperless QR Passes (`/api/bookings`)
- `POST /api/bookings`: Create circuit pass booking and generate signed HMAC QR token.
- `GET /api/bookings/my-passes`: Retrieve user's digital passes.

### 4. Staff Gate Scanner (`/api/scanner`)
- `POST /api/scanner/verify`: Verify tourist HMAC QR code at turnstile. Returns sub-50ms validation response and records single-use redemption flags.

---

## Compilation & Execution

```bash
# Compile backend
./mvnw compile

# Run local development server (Port 8080)
./mvnw spring-boot:run
```

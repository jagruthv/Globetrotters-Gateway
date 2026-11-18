package com.globetrotter.gateway.service;

import com.globetrotter.gateway.model.Role;
import com.globetrotter.gateway.model.User;
import com.globetrotter.gateway.payload.AuthRequest;
import com.globetrotter.gateway.payload.AuthResponse;
import com.globetrotter.gateway.payload.RegisterRequest;
import com.globetrotter.gateway.repository.UserRepository;
import com.globetrotter.gateway.security.JwtUtils;
import com.globetrotter.gateway.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final OtpService otpService;

    @Value("${app.auth.google.client-id:}")
    private String googleClientId;

    public AuthResponse authenticate(AuthRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        String role = userDetails.getAuthorities().iterator().next().getAuthority();

        return AuthResponse.builder()
                .token(jwt)
                .id(userDetails.getId())
                .email(userDetails.getEmail())
                .fullName(userDetails.getFullName())
                .phoneNumber(userDetails.getPhoneNumber())
                .isEmailVerified(userDetails.getIsEmailVerified())
                .isPhoneVerified(userDetails.getIsPhoneVerified())
                .avatarUrl(userDetails.getAvatarUrl())
                .role(role)
                .build();
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Error: Email is already in use!");
        }

        // Public registration is strictly locked to ROLE_TOURIST (prevents privilege escalation)
        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .phoneNumber(request.getPhoneNumber())
                .isEmailVerified(false)
                .isPhoneVerified(false)
                .role(Role.ROLE_TOURIST)
                .build();

        userRepository.save(user);

        // Auto login after registration
        return authenticate(new AuthRequest() {{
            setEmail(request.getEmail());
            setPassword(request.getPassword());
        }});
    }

    /**
     * Authenticates a user with a verified Google Identity Services JWT ID Token.
     * Validates cryptographic signature directly against Google's tokeninfo service.
     */
    @Transactional
    public AuthResponse authenticateGoogle(String idToken) {
        if (idToken == null || idToken.isBlank()) {
            throw new IllegalArgumentException("Google ID token is required.");
        }

        Map<String, Object> tokenClaims;
        try {
            RestClient restClient = RestClient.create();
            tokenClaims = restClient.get()
                    .uri("https://oauth2.googleapis.com/tokeninfo?id_token={token}", idToken.trim())
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.error("Google token verification failed: {}", e.getMessage());
            throw new IllegalArgumentException("Invalid or expired Google authentication credential.");
        }

        if (tokenClaims == null || !tokenClaims.containsKey("sub")) {
            throw new IllegalArgumentException("Failed to extract verified identity from Google token.");
        }

        String googleSub = (String) tokenClaims.get("sub");
        String email = (String) tokenClaims.get("email");
        String name = (String) tokenClaims.get("name");
        String picture = (String) tokenClaims.get("picture");
        Object emailVerifiedObj = tokenClaims.get("email_verified");
        boolean emailVerified = "true".equalsIgnoreCase(String.valueOf(emailVerifiedObj));

        // Locate existing user by Google Sub or Email
        Optional<User> bySub = userRepository.findByGoogleSub(googleSub);
        User user;

        if (bySub.isPresent()) {
            user = bySub.get();
            if (picture != null) user.setAvatarUrl(picture);
            if (emailVerified) user.setIsEmailVerified(true);
        } else {
            Optional<User> byEmail = (email != null) ? userRepository.findByEmail(email) : Optional.empty();
            if (byEmail.isPresent()) {
                // Link Google account to existing user record
                user = byEmail.get();
                user.setGoogleSub(googleSub);
                if (picture != null) user.setAvatarUrl(picture);
                if (emailVerified) {
                    user.setIsEmailVerified(true);
                    user.setEmailVerifiedAt(LocalDateTime.now());
                }
            } else {
                // First-time Google user: Create new profile
                user = User.builder()
                        .email(email)
                        .fullName(name != null && !name.isBlank() ? name : "Google Explorer")
                        .googleSub(googleSub)
                        .avatarUrl(picture)
                        .isEmailVerified(emailVerified)
                        .emailVerifiedAt(emailVerified ? LocalDateTime.now() : null)
                        .isPhoneVerified(false)
                        .role(Role.ROLE_TOURIST)
                        .build();
            }
        }

        userRepository.save(user);

        String username = user.getEmail() != null ? user.getEmail() : "google_" + user.getGoogleSub();
        String jwt = jwtUtils.generateTokenFromUsername(username, user.getRole().name());

        return buildAuthResponse(user, jwt);
    }

    /**
     * Authenticates or registers a user via Mobile Phone OTP.
     */
    @Transactional
    public AuthResponse authenticateMobileOtp(String rawPhone, String enteredOtp) {
        boolean valid = otpService.verifyPhoneOtp(rawPhone, enteredOtp);
        if (!valid) {
            throw new IllegalArgumentException("Invalid verification code. Please check your SMS or WhatsApp and try again.");
        }

        String cleanPhone = rawPhone.replaceAll("\\D", "");
        if (cleanPhone.length() > 10) cleanPhone = cleanPhone.substring(cleanPhone.length() - 10);
        String formattedPhone = "+91 " + cleanPhone;

        Optional<User> byPhone = userRepository.findByPhoneNumber(formattedPhone);
        User user;

        if (byPhone.isPresent()) {
            user = byPhone.get();
            user.setIsPhoneVerified(true);
            user.setPhoneVerifiedAt(LocalDateTime.now());
        } else {
            user = User.builder()
                    .phoneNumber(formattedPhone)
                    .fullName("Traveler " + formattedPhone.substring(0, 8) + "...")
                    .isPhoneVerified(true)
                    .phoneVerifiedAt(LocalDateTime.now())
                    .isEmailVerified(false)
                    .role(Role.ROLE_TOURIST)
                    .build();
        }

        userRepository.save(user);

        String username = user.getEmail() != null ? user.getEmail() : formattedPhone;
        String jwt = jwtUtils.generateTokenFromUsername(username, user.getRole().name());

        return buildAuthResponse(user, jwt);
    }

    /**
     * Authenticates a user via Email OTP (passwordless email verification).
     */
    @Transactional
    public AuthResponse authenticateEmailOtp(String email, String enteredOtp) {
        boolean valid = otpService.verifyEmailOtp(email, enteredOtp);
        if (!valid) {
            throw new IllegalArgumentException("Invalid verification code. Please check your email inbox and try again.");
        }

        String cleanEmail = email.toLowerCase().trim();
        Optional<User> byEmail = userRepository.findByEmail(cleanEmail);
        User user;

        if (byEmail.isPresent()) {
            user = byEmail.get();
            user.setIsEmailVerified(true);
            user.setEmailVerifiedAt(LocalDateTime.now());
        } else {
            user = User.builder()
                    .email(cleanEmail)
                    .fullName(cleanEmail.split("@")[0])
                    .isEmailVerified(true)
                    .emailVerifiedAt(LocalDateTime.now())
                    .isPhoneVerified(false)
                    .role(Role.ROLE_TOURIST)
                    .build();
        }

        userRepository.save(user);

        String jwt = jwtUtils.generateTokenFromUsername(cleanEmail, user.getRole().name());
        return buildAuthResponse(user, jwt);
    }

    /**
     * Links a verified phone number to an existing authenticated user profile.
     */
    @Transactional
    public AuthResponse linkPhone(Long userId, String rawPhone, String enteredOtp) {
        boolean valid = otpService.verifyPhoneOtp(rawPhone, enteredOtp);
        if (!valid) {
            throw new IllegalArgumentException("Invalid verification code. Phone verification failed.");
        }

        String cleanPhone = rawPhone.replaceAll("\\D", "");
        if (cleanPhone.length() > 10) cleanPhone = cleanPhone.substring(cleanPhone.length() - 10);
        String formattedPhone = "+91 " + cleanPhone;

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        Optional<User> existing = userRepository.findByPhoneNumber(formattedPhone);
        if (existing.isPresent() && !existing.get().getId().equals(userId)) {
            throw new IllegalArgumentException("This mobile number is already linked to another Globetrotter account.");
        }

        user.setPhoneNumber(formattedPhone);
        user.setIsPhoneVerified(true);
        user.setPhoneVerifiedAt(LocalDateTime.now());
        userRepository.save(user);

        String username = user.getEmail() != null ? user.getEmail() : formattedPhone;
        String jwt = jwtUtils.generateTokenFromUsername(username, user.getRole().name());
        return buildAuthResponse(user, jwt);
    }

    /**
     * Links a verified email address to an existing authenticated user profile.
     */
    @Transactional
    public AuthResponse linkEmail(Long userId, String email, String enteredOtp) {
        boolean valid = otpService.verifyEmailOtp(email, enteredOtp);
        if (!valid) {
            throw new IllegalArgumentException("Invalid verification code. Email verification failed.");
        }

        String cleanEmail = email.toLowerCase().trim();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        Optional<User> existing = userRepository.findByEmail(cleanEmail);
        if (existing.isPresent() && !existing.get().getId().equals(userId)) {
            throw new IllegalArgumentException("This email address is already linked to another Globetrotter account.");
        }

        user.setEmail(cleanEmail);
        user.setIsEmailVerified(true);
        user.setEmailVerifiedAt(LocalDateTime.now());
        userRepository.save(user);

        String jwt = jwtUtils.generateTokenFromUsername(cleanEmail, user.getRole().name());
        return buildAuthResponse(user, jwt);
    }

    private AuthResponse buildAuthResponse(User user, String jwt) {
        return AuthResponse.builder()
                .token(jwt)
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phoneNumber(user.getPhoneNumber())
                .isEmailVerified(user.getIsEmailVerified())
                .isPhoneVerified(user.getIsPhoneVerified())
                .avatarUrl(user.getAvatarUrl())
                .googleSub(user.getGoogleSub())
                .role(user.getRole().name())
                .build();
    }
}

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
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

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
                .role(Role.ROLE_TOURIST)
                .build();

        userRepository.save(user);

        // Auto login after registration
        return authenticate(new AuthRequest() {{
            setEmail(request.getEmail());
            setPassword(request.getPassword());
        }});
    }
}

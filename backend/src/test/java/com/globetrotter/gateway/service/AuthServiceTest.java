package com.globetrotter.gateway.service;

import com.globetrotter.gateway.model.Role;
import com.globetrotter.gateway.model.User;
import com.globetrotter.gateway.payload.AuthRequest;
import com.globetrotter.gateway.payload.AuthResponse;
import com.globetrotter.gateway.payload.RegisterRequest;
import com.globetrotter.gateway.repository.UserRepository;
import com.globetrotter.gateway.security.JwtUtils;
import com.globetrotter.gateway.security.UserDetailsImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtils jwtUtils;

    @InjectMocks
    private AuthService authService;

    @Test
    @DisplayName("Public registration strictly enforces ROLE_TOURIST (prevents privilege escalation)")
    void testPublicRegistrationEnforcesTouristRole() {
        RegisterRequest req = new RegisterRequest();
        req.setEmail("newuser@globetrotter.com");
        req.setPassword("SecurePass123!");
        req.setFullName("Suresh Kumar");
        req.setPhoneNumber("+919876543210");

        when(userRepository.existsByEmail("newuser@globetrotter.com")).thenReturn(false);
        when(passwordEncoder.encode("SecurePass123!")).thenReturn("encoded_pass_hash");

        // Mock the auto-login
        Authentication auth = mock(Authentication.class);
        UserDetailsImpl userDetails = new UserDetailsImpl(
                1L, "newuser@globetrotter.com", "encoded_pass_hash", "Suresh Kumar",
                List.of(new SimpleGrantedAuthority("ROLE_TOURIST"))
        );
        when(auth.getPrincipal()).thenReturn(userDetails);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(auth);
        when(jwtUtils.generateJwtToken(auth)).thenReturn("jwt_mock_token");

        AuthResponse resp = authService.register(req);

        assertNotNull(resp);
        assertEquals("ROLE_TOURIST", resp.getRole());

        // Capture saved User to verify role is locked to ROLE_TOURIST
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User savedUser = captor.getValue();

        assertEquals(Role.ROLE_TOURIST, savedUser.getRole());
        assertEquals("newuser@globetrotter.com", savedUser.getEmail());
    }

    @Test
    @DisplayName("Registration rejects duplicate email")
    void testDuplicateEmailRejected() {
        RegisterRequest req = new RegisterRequest();
        req.setEmail("existing@globetrotter.com");
        req.setPassword("Password123!");

        when(userRepository.existsByEmail("existing@globetrotter.com")).thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                authService.register(req));

        assertTrue(ex.getMessage().contains("Email is already in use"));
        verify(userRepository, never()).save(any(User.class));
    }
}

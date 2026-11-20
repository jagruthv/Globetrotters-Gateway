package com.globetrotter.gateway.security;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.globetrotter.gateway.model.User;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;
import java.util.List;

@AllArgsConstructor
@Getter
public class UserDetailsImpl implements UserDetails {

    private Long id;
    private String email;
    private String fullName;
    private String phoneNumber;
    private Boolean isEmailVerified;
    private Boolean isPhoneVerified;
    private String avatarUrl;
    private Long assignedLocationId;
    private String assignedLocationName;

    @JsonIgnore
    private String password;

    private Collection<? extends GrantedAuthority> authorities;

    public UserDetailsImpl(Long id, String email, String fullName, String password, Collection<? extends GrantedAuthority> authorities) {
        this(id, email, fullName, null, false, false, null, null, null, password, authorities);
    }

    public static UserDetailsImpl build(User user) {
        List<GrantedAuthority> authorities = Collections.singletonList(
                new SimpleGrantedAuthority(user.getRole().name())
        );

        String username = user.getEmail() != null ? user.getEmail() :
                (user.getPhoneNumber() != null ? user.getPhoneNumber() : "user_" + user.getId());

        Long assignedLocationId = user.getAssignedLocation() != null ? user.getAssignedLocation().getId() : null;
        String assignedLocationName = user.getAssignedLocation() != null ? user.getAssignedLocation().getName() : null;

        return new UserDetailsImpl(
                user.getId(),
                username,
                user.getFullName(),
                user.getPhoneNumber(),
                user.getIsEmailVerified(),
                user.getIsPhoneVerified(),
                user.getAvatarUrl(),
                assignedLocationId,
                assignedLocationName,
                user.getPassword() != null ? user.getPassword() : "",
                authorities
        );
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}

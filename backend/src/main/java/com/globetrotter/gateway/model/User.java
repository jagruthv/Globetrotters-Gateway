package com.globetrotter.gateway.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Email
    @Column(unique = true)
    private String email;

    @Column
    private String password;

    @Column(nullable = false)
    private String fullName;

    @Column(unique = true)
    private String phoneNumber;

    @Column(unique = true)
    private String googleSub;

    @Column
    private String avatarUrl;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isEmailVerified = false;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isPhoneVerified = false;

    private LocalDateTime phoneVerifiedAt;
    private LocalDateTime emailVerifiedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.role == null) {
            this.role = Role.ROLE_TOURIST;
        }
        if (this.isEmailVerified == null) {
            this.isEmailVerified = false;
        }
        if (this.isPhoneVerified == null) {
            this.isPhoneVerified = false;
        }
    }
}

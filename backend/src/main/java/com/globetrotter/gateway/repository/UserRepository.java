package com.globetrotter.gateway.repository;

import com.globetrotter.gateway.model.Role;
import com.globetrotter.gateway.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Boolean existsByEmail(String email);
    Optional<User> findByPhoneNumber(String phoneNumber);
    Boolean existsByPhoneNumber(String phoneNumber);
    Optional<User> findByGoogleSub(String googleSub);
    List<User> findByRole(Role role);
}

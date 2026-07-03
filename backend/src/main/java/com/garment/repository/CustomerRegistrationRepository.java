package com.garment.repository;

import com.garment.entity.CustomerRegistration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerRegistrationRepository extends JpaRepository<CustomerRegistration, Long> {

    boolean existsByPhone(String phone);
    boolean existsByEmail(String email);

    Optional<CustomerRegistration> findByPhone(String phone);

    // Admin: filter by status
    List<CustomerRegistration> findByStatusOrderByCreatedAtDesc(CustomerRegistration.AccountStatus status);

    // All, newest first
    List<CustomerRegistration> findAllByOrderByCreatedAtDesc();

    // ── NEW: for broker "party orders" screen ─────────────────────────
    // A party could in theory have more than one linked customer login
    // (e.g. re-registered), so this returns a list rather than Optional.
    List<CustomerRegistration> findByPartyId(Long partyId);
}
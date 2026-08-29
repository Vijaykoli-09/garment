package com.garment.repository;

import com.garment.entity.CustomerRegistration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerRegistrationRepository extends JpaRepository<CustomerRegistration, Long> {

    // ── Kept for places that specifically need the PRIMARY number only ──
    // (e.g. profile refresh, where the JWT subject is always the primary phone)
    boolean existsByPhone(String phone);
    boolean existsByEmail(String email);
    Optional<CustomerRegistration> findByPhone(String phone);

    // ══════════════════════════════════════════════════════════════════
    // NEW — multi-number lookup. Matches against the primary `phone`
    // column OR any entry in the `extraPhoneNumbers` child table.
    // Use these for LOGIN and duplicate-registration checks, so any
    // number a customer/party registered with works.
    // ══════════════════════════════════════════════════════════════════
    @Query("SELECT DISTINCT c FROM CustomerRegistration c LEFT JOIN c.extraPhoneNumbers e " +
           "WHERE c.phone = :phone OR e = :phone")
    Optional<CustomerRegistration> findByPhoneOrExtraPhoneNumber(@Param("phone") String phone);

    @Query("SELECT CASE WHEN COUNT(c) > 0 THEN true ELSE false END FROM CustomerRegistration c " +
           "LEFT JOIN c.extraPhoneNumbers e WHERE c.phone = :phone OR e = :phone")
    boolean existsByPhoneOrExtraPhoneNumber(@Param("phone") String phone);

    // Admin: filter by status
    List<CustomerRegistration> findByStatusOrderByCreatedAtDesc(CustomerRegistration.AccountStatus status);

    // All, newest first
    List<CustomerRegistration> findAllByOrderByCreatedAtDesc();

    // ── for broker "party orders" screen ─────────────────────────
    // A party could in theory have more than one linked customer login
    // (e.g. re-registered), so this returns a list rather than Optional.
    List<CustomerRegistration> findByPartyId(Long partyId);
}
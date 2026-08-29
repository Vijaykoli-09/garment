package com.garment.service;

import com.garment.entity.CustomerRegistration;
import com.garment.entity.CustomerRegistration.AccountStatus;
import com.garment.entity.CustomerRegistration.CustomerType;
import com.garment.model.Party;
import com.garment.repository.CustomerRegistrationRepository;
import com.garment.repository.PartyRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * PartyAuthService
 *
 * Business logic for the 2-step "Party Login with GST" flow.
 *
 * Key design decision:
 *   We do NOT create a separate login system for parties.
 *   Instead, when a party sets their password, we create a
 *   CustomerRegistration row for them (status = APPROVED,
 *   partyId linked) so they log in via the EXISTING
 *   POST /customer/auth/login endpoint — no changes to
 *   CustomerRegistrationService or JwtAuthFilter needed.
 *
 * UPDATED: A party can have multiple mobile numbers (Party.mobileNos).
 * Previously only the FIRST number was ever saved as a login credential.
 * Now ALL of the party's numbers are saved — the first becomes the
 * primary CustomerRegistration.phone (JWT subject), the rest go into
 * CustomerRegistration.extraPhoneNumbers — so login works with any of them.
 *
 * Place at: src/main/java/com/garment/service/PartyAuthService.java
 */
@Service
public class PartyAuthService {

    private final PartyRepository             partyRepo;
    private final CustomerRegistrationRepository customerRepo;
    private final BCryptPasswordEncoder       passwordEncoder;

    public PartyAuthService(PartyRepository partyRepo,
                            CustomerRegistrationRepository customerRepo,
                            BCryptPasswordEncoder passwordEncoder) {
        this.partyRepo       = partyRepo;
        this.customerRepo    = customerRepo;
        this.passwordEncoder = passwordEncoder;
    }

    // ────────────────────────────────────────────────────────────────
    // STEP 1 — Verify GST
    //
    // Returns: { partyId, partyName, phone }
    // Throws:
    //   "GST_NOT_FOUND: ..."      → 404 to controller
    //   "ALREADY_REGISTERED: ..." → 409 to controller
    // ────────────────────────────────────────────────────────────────
    public Map<String, Object> verifyGst(String gstNo) {

        // 1. Find party by GST number
        Party party = partyRepo.findByGstNo(gstNo);
        if (party == null) {
            throw new RuntimeException(
                    "GST_NOT_FOUND: No party found with GST number: " + gstNo
            );
        }

        // 2. Check if ANY of this party's numbers already has login
        //    credentials (i.e. they already set a password before).
        List<String> allNumbers = getAllMobileNos(party);
        boolean alreadyRegistered = allNumbers.stream()
                .anyMatch(customerRepo::existsByPhoneOrExtraPhoneNumber);
        if (alreadyRegistered) {
            throw new RuntimeException(
                    "ALREADY_REGISTERED: This party already has login credentials. Please login normally."
            );
        }

        // 3. Return primary party details to frontend — phone auto-fills, read-only
        String phone = allNumbers.isEmpty() ? "" : allNumbers.get(0);
        Map<String, Object> result = new HashMap<>();
        result.put("partyId",   party.getId());
        result.put("partyName", party.getPartyName());
        result.put("phone",     phone);
        return result;
    }

    // ────────────────────────────────────────────────────────────────
    // STEP 2 — Set Password
    //
    // Creates a CustomerRegistration for this party (status = APPROVED,
    // linked via partyId) so they can log in via /customer/auth/login
    // using ANY of the party's registered mobile numbers.
    //
    // Throws:
    //   "PARTY_NOT_FOUND: ..."    → 404
    //   "ALREADY_REGISTERED: ..." → 409
    // ────────────────────────────────────────────────────────────────
    @Transactional
    public void setPassword(Long partyId, String rawPassword, String phoneFromRequest) {
        // 1. Find the party
        Party party = partyRepo.findById(partyId)
                .orElseThrow(() -> new RuntimeException(
                        "PARTY_NOT_FOUND: Party not found with id: " + partyId
                ));

        // 2. Build the full set of numbers to register:
        //    - the phone the app explicitly sent (from verify-gst step), if any
        //    - plus every mobile number on the party record
        //    First one becomes primary; rest become extra.
        Set<String> combined = new LinkedHashSet<>();
        if (phoneFromRequest != null && !phoneFromRequest.isBlank()) {
            combined.add(phoneFromRequest.trim());
        }
        combined.addAll(getAllMobileNos(party));

        List<String> allNumbers = new ArrayList<>(combined);
        if (allNumbers.isEmpty()) {
            throw new RuntimeException("PARTY_NOT_FOUND: Party has no registered mobile number.");
        }
        String primaryPhone = allNumbers.get(0);
        List<String> extraPhones = allNumbers.subList(1, allNumbers.size());

        // 3. Guard: already registered — check EVERY number, not just primary
        boolean alreadyRegistered = allNumbers.stream()
                .anyMatch(customerRepo::existsByPhoneOrExtraPhoneNumber);
        if (alreadyRegistered) {
            throw new RuntimeException(
                    "ALREADY_REGISTERED: This party already has login credentials."
            );
        }

        // 4. Build CustomerRegistration — pre-approved, directly linked to party
        CustomerRegistration reg = new CustomerRegistration();
        reg.setFullName(party.getPartyName());
        reg.setPhone(primaryPhone);
        reg.setExtraPhoneNumbers(new ArrayList<>(extraPhones));
        reg.setEmail(null);                                  // party may not have email
        reg.setPassword(passwordEncoder.encode(rawPassword));
        reg.setDeliveryAddress(
                buildAddress(party)                              // pull address from party
        );
        reg.setGstNo(party.getGstNo());
        reg.setStatus(AccountStatus.APPROVED);               // ← directly APPROVED, no admin step
        reg.setCreditEnabled(false);
        reg.setCreditLimit(0.0);
        reg.setAdvanceOption(false);
        reg.setPartyId(party.getId());                       // ← link to party record
        reg.setCreatedAt(LocalDateTime.now());

        // Map Party customerType → CustomerRegistration.CustomerType
        if (party.getCustomerType() != null) {
            try {
                CustomerType type = switch (party.getCustomerType().toString().toUpperCase()) {
                    case "WHOLESALER"      -> CustomerType.Wholesaler;
                    case "SEMI_WHOLESALER" -> CustomerType.Semi_Wholesaler;
                    case "RETAILER"        -> CustomerType.Retailer;
                    default                -> null;
                };
                reg.setCustomerType(type);
            } catch (Exception ignored) {
                // type mapping failed — leave null, admin can fix later
            }
        }

        customerRepo.save(reg);
        // That's it. Party can now POST /customer/auth/login with ANY of
        // their registered numbers + password.
    }

    /**
     * Returns ALL valid mobile numbers from the Party's mobileNos list,
     * trimmed and de-duplicated, in original order.
     */
    private List<String> getAllMobileNos(Party party) {
        if (party == null || party.getMobileNos() == null) {
            return new ArrayList<>();
        }

        Set<String> seen = new LinkedHashSet<>();
        for (String mobile : party.getMobileNos()) {
            if (mobile != null && !mobile.isBlank()) {
                seen.add(mobile.trim());
            }
        }
        return new ArrayList<>(seen);
    }

    // ── Helper: build a delivery address string from party fields ────
    private String buildAddress(Party party) {
        // Party has: address, station (city/area), stateName
        // Combine what's available into a readable string
        StringBuilder sb = new StringBuilder();
        if (party.getAddress()   != null && !party.getAddress().isBlank())   sb.append(party.getAddress());
        if (party.getStation()   != null && !party.getStation().isBlank())   { if (sb.length() > 0) sb.append(", "); sb.append(party.getStation()); }
        if (party.getStateName() != null && !party.getStateName().isBlank()) { if (sb.length() > 0) sb.append(", "); sb.append(party.getStateName()); }
        return sb.toString();
    }
}
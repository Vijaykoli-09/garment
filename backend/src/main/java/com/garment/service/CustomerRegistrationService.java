package com.garment.service;

import com.garment.DTO.*;
import com.garment.entity.CustomerRegistration;
import com.garment.entity.CustomerRegistration.AccountStatus;
import com.garment.entity.CustomerRegistration.CustomerType;
import com.garment.repository.CustomerRegistrationRepository;
import com.garment.security.JwtUtil;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class CustomerRegistrationService {

    private final CustomerRegistrationRepository repo;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public CustomerRegistrationService(CustomerRegistrationRepository repo,
                                       BCryptPasswordEncoder passwordEncoder,
                                       JwtUtil jwtUtil) {
        this.repo = repo;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    // ────────────────────────────────────────────────────────────────
    // SIGNUP  (called from React Native SignupScreen)
    // ────────────────────────────────────────────────────────────────
    public String signup(AppSignupRequest req) {

        // 1. Duplicate checks
        if (repo.existsByPhone(req.getPhone())) {
            throw new RuntimeException("Phone number already registered.");
        }
       if (req.getEmail() != null && !req.getEmail().isBlank() && repo.existsByEmail(req.getEmail())) {
    throw new RuntimeException("Email already registered.");
}

        // 2. Build entity — customerType is intentionally null here.
        //    Admin will set it when approving the customer via CustomerRequests page.
        CustomerRegistration customer = new CustomerRegistration();
        customer.setFullName(req.getFullName());
        customer.setEmail(req.getEmail());
        customer.setPhone(req.getPhone());
        customer.setPassword(passwordEncoder.encode(req.getPassword()));
        // customerType is NOT set here — admin sets it during approval
        customer.setDeliveryAddress(req.getDeliveryAddress());
        customer.setGstNo(req.getGstNo());
        customer.setBrokerName(req.getBrokerName());
        customer.setBrokerPhone(req.getBrokerPhone());
        customer.setStatus(AccountStatus.PENDING);
        customer.setCreatedAt(LocalDateTime.now());
        // partyId starts as null — admin links it later via PartyCreation

        repo.save(customer);

        return "Registration successful! Your account is under review. Please try logging in after 30 minutes.";
    }

    // ────────────────────────────────────────────────────────────────
    // LOGIN  (called from React Native LoginScreen)
    // ────────────────────────────────────────────────────────────────
    public CustomerLoginResponse login(CustomerLoginRequest req) {

        // 1. Find by phone
        CustomerRegistration customer = repo.findByPhone(req.getPhone())
                .orElseThrow(() -> new RuntimeException("Invalid phone number or password."));

        // 2. Check password
        if (!passwordEncoder.matches(req.getPassword(), customer.getPassword())) {
            throw new RuntimeException("Invalid phone number or password.");
        }

        // 3. Check approval status
        if (customer.getStatus() == AccountStatus.PENDING) {
            throw new RuntimeException("PENDING: Your account is under review. Please try after some time.");
        }
        if (customer.getStatus() == AccountStatus.REJECTED) {
            throw new RuntimeException("REJECTED: Your account has been rejected. Please contact support.");
        }

        // 4. Generate JWT using phone as subject
        String token = jwtUtil.generateToken(customer.getPhone());

        return new CustomerLoginResponse(
                token,
                customer.getId(),
                customer.getFullName(),
                customer.getPhone(),
                customer.getEmail(),
                customer.getCustomerType() != null ? customer.getCustomerType().name() : null,
                Boolean.TRUE.equals(customer.getCreditEnabled()),
                customer.getCreditLimit() != null ? customer.getCreditLimit() : 0.0,
                Boolean.TRUE.equals(customer.getAdvanceOption()),
                customer.getPartyId()
        );
    }

    // ────────────────────────────────────────────────────────────────
    // ADMIN: Get all customers (optionally filter by status)
    // ────────────────────────────────────────────────────────────────
    public List<CustomerRegistration> getAllCustomers(String status) {
        if (status != null && !status.isEmpty()) {
            try {
                AccountStatus accountStatus = AccountStatus.valueOf(status.toUpperCase());
                return repo.findByStatusOrderByCreatedAtDesc(accountStatus);
            } catch (IllegalArgumentException e) {
                throw new RuntimeException("Invalid status filter: " + status);
            }
        }
        return repo.findAllByOrderByCreatedAtDesc();
    }

    // ────────────────────────────────────────────────────────────────
    // ADMIN: Approve customer with payment config
    // ────────────────────────────────────────────────────────────────
    public CustomerRegistration approveCustomer(Long id, ApproveCustomerRequest req) {

        CustomerRegistration customer = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Customer not found with id: " + id));

        // Validate credit limit if credit is enabled
        if (req.isCreditEnabled() && req.getCreditLimit() <= 0) {
            throw new RuntimeException("Credit limit must be greater than 0 when credit is enabled.");
        }

        customer.setStatus(AccountStatus.APPROVED);
        customer.setCreditEnabled(req.isCreditEnabled());
        customer.setCreditLimit(req.isCreditEnabled() ? req.getCreditLimit() : 0.0);
        customer.setAdvanceOption(req.isAdvanceOption());
        customer.setReviewedAt(LocalDateTime.now());

        // Set customer type if provided by admin during approval
        if (req.getCustomerType() != null && !req.getCustomerType().isBlank()) {
            try {
                CustomerType type = CustomerType.valueOf(
                    req.getCustomerType().replace("-", "_").replace(" ", "_")
                );
                customer.setCustomerType(type);
            } catch (IllegalArgumentException e) {
                throw new RuntimeException("Invalid customer type: " + req.getCustomerType());
            }
        }

        return repo.save(customer);
    }

    // ────────────────────────────────────────────────────────────────
    // ADMIN: Reject customer
    // ────────────────────────────────────────────────────────────────
    public CustomerRegistration rejectCustomer(Long id) {

        CustomerRegistration customer = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Customer not found with id: " + id));

        customer.setStatus(AccountStatus.REJECTED);
        customer.setReviewedAt(LocalDateTime.now());

        return repo.save(customer);
    }

    // ────────────────────────────────────────────────────────────────
    // PROFILE — returns fresh credit settings for the logged-in customer
    // Called by the app on launch to pick up admin changes after login.
    // ────────────────────────────────────────────────────────────────
    public CustomerLoginResponse getProfile(String phone) {
        CustomerRegistration customer = repo.findByPhone(phone)
                .orElseThrow(() -> new RuntimeException("Customer not found."));

        // Re-use the same response shape as login — app merges creditEnabled,
        // creditLimit, advanceOption, partyId into the cached user object.
        return new CustomerLoginResponse(
                null,  // no new token needed
                customer.getId(),
                customer.getFullName(),
                customer.getPhone(),
                customer.getEmail(),
                customer.getCustomerType() != null ? customer.getCustomerType().name() : null,
                Boolean.TRUE.equals(customer.getCreditEnabled()),
                customer.getCreditLimit() != null ? customer.getCreditLimit() : 0.0,
                Boolean.TRUE.equals(customer.getAdvanceOption()),
                customer.getPartyId()
        );
    }

    // ────────────────────────────────────────────────────────────────
    // ADMIN: Update customer status + payment config
    // ────────────────────────────────────────────────────────────────
    public CustomerRegistration updateCustomer(Long id, UpdateCustomerRequest req) {

        CustomerRegistration customer = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Customer not found with id: " + id));

        AccountStatus newStatus;
        try {
            newStatus = AccountStatus.valueOf(req.getStatus().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid status: " + req.getStatus() + ". Must be APPROVED or REJECTED.");
        }

        if (newStatus == AccountStatus.PENDING) {
            throw new RuntimeException("Cannot manually set status back to PENDING.");
        }

        // Validate credit limit if approving with credit enabled
        if (newStatus == AccountStatus.APPROVED && req.isCreditEnabled() && req.getCreditLimit() <= 0) {
            throw new RuntimeException("Credit limit must be greater than 0 when credit is enabled.");
        }

        customer.setStatus(newStatus);
        customer.setReviewedAt(LocalDateTime.now());

        if (newStatus == AccountStatus.APPROVED) {
            customer.setCreditEnabled(req.isCreditEnabled());
            customer.setCreditLimit(req.isCreditEnabled() ? req.getCreditLimit() : 0.0);
            customer.setAdvanceOption(req.isAdvanceOption());
            // Update customer type if admin provides it
            if (req.getCustomerType() != null && !req.getCustomerType().isBlank()) {
                try {
                    CustomerType type = CustomerType.valueOf(
                        req.getCustomerType().replace("-", "_").replace(" ", "_")
                    );
                    customer.setCustomerType(type);
                } catch (IllegalArgumentException e) {
                    throw new RuntimeException("Invalid customer type: " + req.getCustomerType());
                }
            }
        } else {
            // Rejected: clear payment config
            customer.setCreditEnabled(false);
            customer.setCreditLimit(0.0);
            customer.setAdvanceOption(false);
        }

        return repo.save(customer);
    }

    // ────────────────────────────────────────────────────────────────
    // ADMIN: Link a party to a customer
    // Called after admin creates a party in PartyCreation and wants to
    // associate it with this customer so the app can use partyId.
    // ────────────────────────────────────────────────────────────────
    public CustomerRegistration linkParty(Long customerId, Long partyId) {
        CustomerRegistration customer = repo.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Customer not found with id: " + customerId));

        customer.setPartyId(partyId);
        return repo.save(customer);
    }
    // ────────────────────────────────────────────────────────────────
// ADMIN: Sync customerType from Party → CustomerRegistration
// Called automatically after party is saved in PartyCreation and
// auto-linked. Keeps customerType in sync without admin re-entering it.
// ────────────────────────────────────────────────────────────────
public CustomerRegistration syncCustomerType(Long customerId, String customerTypeStr) {
    CustomerRegistration customer = repo.findById(customerId)
            .orElseThrow(() -> new RuntimeException("Customer not found with id: " + customerId));

    if (customerTypeStr != null && !customerTypeStr.isBlank()) {
        try {
            // Party uses: WHOLESALER, SEMI_WHOLESALER, RETAILER
            // CustomerRegistration uses: Wholesaler, Semi_Wholesaler, Retailer
            // Map party enum → registration enum
            CustomerType type = switch (customerTypeStr.toUpperCase()) {
                case "WHOLESALER"      -> CustomerType.Wholesaler;
                case "SEMI_WHOLESALER" -> CustomerType.Semi_Wholesaler;
                case "RETAILER"        -> CustomerType.Retailer;
                default -> CustomerType.valueOf(
                    customerTypeStr.replace("-", "_").replace(" ", "_")
                );
            };
            customer.setCustomerType(type);
            return repo.save(customer);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid customer type: " + customerTypeStr);
        }
    }
    return customer; // nothing to sync if type is null/blank
}
}
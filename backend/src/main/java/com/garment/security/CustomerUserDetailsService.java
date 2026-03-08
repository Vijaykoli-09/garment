package com.garment.security;

import com.garment.entity.CustomerRegistration;
import com.garment.repository.CustomerRegistrationRepository;
import org.springframework.stereotype.Service;

import java.util.Collections;

/**
 * Loads mobile app customers by PHONE NUMBER for JWT authentication.
 * 
 * The web admin UserDetailsService loads by email/username.
 * Mobile JWT tokens have phone as the subject — so we need a separate
 * service that looks up by phone, not email.
 */
@Service
public class CustomerUserDetailsService
        implements org.springframework.security.core.userdetails.UserDetailsService {

    private final CustomerRegistrationRepository repo;

    public CustomerUserDetailsService(CustomerRegistrationRepository repo) {
        this.repo = repo;
    }

    @Override
    public org.springframework.security.core.userdetails.UserDetails loadUserByUsername(String phone)
            throws org.springframework.security.core.userdetails.UsernameNotFoundException {

        CustomerRegistration customer = repo.findByPhone(phone)
                .orElseThrow(() -> new org.springframework.security.core.userdetails.UsernameNotFoundException(
                        "Customer not found with phone: " + phone));

        // Build a Spring Security UserDetails from the CustomerRegistration entity.
        // We use phone as the username so it matches the JWT subject exactly.
        return new org.springframework.security.core.userdetails.User(
                customer.getPhone(),       // username = phone (matches JWT subject)
                customer.getPassword(),    // BCrypt hashed password
                Collections.emptyList()    // no roles needed for mobile customers
        );
    }
}
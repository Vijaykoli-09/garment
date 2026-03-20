package com.garment.security;

import com.garment.entity.CustomerRegistration;
import com.garment.entity.CustomerRegistration.AccountStatus;
import com.garment.repository.CustomerRegistrationRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Loads mobile app customers by PHONE NUMBER for JWT authentication.
 *
 * CHANGE from your version: added APPROVED status check.
 * If admin rejects a customer AFTER they got a token, their
 * next API call will correctly return 403 instead of succeeding.
 */
@Service
public class CustomerUserDetailsService implements UserDetailsService {

    private final CustomerRegistrationRepository repo;

    public CustomerUserDetailsService(CustomerRegistrationRepository repo) {
        this.repo = repo;
    }

    @Override
    public UserDetails loadUserByUsername(String phone) throws UsernameNotFoundException {

        CustomerRegistration customer = repo.findByPhone(phone)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "Customer not found with phone: " + phone));

        // Block access if customer is not APPROVED
        // (e.g. admin rejected them after they already logged in)
        if (customer.getStatus() != AccountStatus.APPROVED) {
            throw new UsernameNotFoundException(
                    "Customer account is not approved: " + phone);
        }

        return new User(
                customer.getPhone(),
                customer.getPassword(),
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))
        );
    }
}
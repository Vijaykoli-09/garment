package com.garment.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final CustomUserDetailsService customUserDetailsService;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter, CustomUserDetailsService customUserDetailsService) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.customUserDetailsService = customUserDetailsService;
    }

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth

                // ── Existing web admin auth ──────────────────────────
                .requestMatchers("/api/auth/**").permitAll()

                // ── NEW: Mobile app customer auth ────────────────────
                .requestMatchers("/api/customer/auth/**").permitAll()

                // ── Admin customer management (open for now) ─────────
                .requestMatchers("/api/admin/customers/**").permitAll()

                // ── All your existing permitted endpoints (unchanged) ─
                .requestMatchers("/api/sizes/**").permitAll()
                .requestMatchers("/api/party/**").permitAll()
                .requestMatchers("/api/artgroup/**").permitAll()
                .requestMatchers("/api/range/**").permitAll()
                .requestMatchers("/api/yarn/**").permitAll()
                .requestMatchers("/api/fabrication/**").permitAll()
                .requestMatchers("/api/agent/**").permitAll()
                .requestMatchers("/api/process/**").permitAll()
                .requestMatchers("/api/shade/**").permitAll()
                .requestMatchers("/api/arts/**").permitAll()
                .requestMatchers("/api/grades/**").permitAll()
                .requestMatchers("/api/accessories/**").permitAll()
                .requestMatchers("/api/categories/**").permitAll()
                .requestMatchers("/api/artgroups/**").permitAll()
                .requestMatchers("/api/material-groups/**").permitAll()
                .requestMatchers("/api/employees/**").permitAll()
                .requestMatchers("/api/materials/**").permitAll()
                .requestMatchers("/api/ranges/**").permitAll()
                .requestMatchers("/api/transports/**").permitAll()
                .requestMatchers("/api/purchase-orders/**").permitAll()
                .requestMatchers("/api/purchase-entry/**").permitAll()
                .requestMatchers("/api/material-return/**").permitAll()
                .requestMatchers("/api/knitting-outward-challan/**").permitAll()
                .requestMatchers("/api/knitting/**").permitAll()
                .requestMatchers("/api/knitting-material-return/**").permitAll()
                .requestMatchers("/api/purchase-returns/**").permitAll()
                .requestMatchers("/api/packing-challans/**").permitAll()
                .requestMatchers("/api/job-outward-challan/**").permitAll()
                .requestMatchers("/api/job-inward-challan/**").permitAll()
                .requestMatchers("/api/dyeing-outward/**").permitAll()
                .requestMatchers("/api/dyeing-inward/**").permitAll()
                .requestMatchers("/api/cutting-entries/**").permitAll()
                .requestMatchers("/api/finishing-inward-rows/**").permitAll()
                .requestMatchers("/api/finishing-outwards/**").permitAll()
                .requestMatchers("/api/finishing-inwards/**").permitAll()
                .requestMatchers("/api/stock-report/**").permitAll()
                .requestMatchers("/api/amount-report/**").permitAll()
                .requestMatchers("/api/finishing-stock-statement/**").permitAll()
                .requestMatchers("/api/finishing-amount-statement/**").permitAll()
                .requestMatchers("/api/locations/**").permitAll()
                .requestMatchers("/api/sale-orders/**").permitAll()
                .requestMatchers("/api/sale-order-returns/**").permitAll()
                .requestMatchers("/api/payment/**").permitAll()
                .requestMatchers("/api/production-receipt/**").permitAll()
                .requestMatchers("/api/dispatch-challan/**").permitAll()
                .requestMatchers("/api/payment/payment-mode/**").permitAll()
                .requestMatchers("/api/other-dispatch-challan/**").permitAll()
                .requestMatchers("/api/order-settles/**").permitAll()

                // ── ADD THESE 2 lines inside your SecurityConfig.java filterChain() ─────────
// Place them with the other .requestMatchers lines

// Public products (mobile app)
.requestMatchers("/api/products/**").permitAll()

// Admin products (web dashboard) — open for now, lock with ADMIN role later
.requestMatchers("/api/admin/products/**").permitAll()
.requestMatchers("/api/admin/images/**").permitAll()


                .anyRequest().authenticated()
            )
            .userDetailsService(customUserDetailsService)
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
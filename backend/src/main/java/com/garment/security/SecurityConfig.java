package com.garment.security;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import static org.springframework.security.config.Customizer.withDefaults;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {

   private final JwtAuthFilter jwtAuthFilter;
   private final CustomUserDetailsService customUserDetailsService;

   public SecurityConfig(JwtAuthFilter jwtAuthFilter,
                         CustomUserDetailsService customUserDetailsService) {
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

   // ✅ CORS config for Vercel + Localhost
   @Bean
   public CorsConfigurationSource corsConfigurationSource() {
      CorsConfiguration config = new CorsConfiguration();

      // Your frontend domains:
      config.setAllowedOrigins(List.of(
          "https://garment-six.vercel.app",
          "http://localhost:3000"
      ));

      // If you also want Vercel preview deployments, use:
      // config.setAllowedOriginPatterns(List.of("https://*.vercel.app", "http://localhost:3000"));

      config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
      config.setAllowedHeaders(List.of("*"));
      config.setExposedHeaders(List.of("Authorization"));

      // Usually FALSE for JWT in header (recommended)
      config.setAllowCredentials(false);

      UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
      source.registerCorsConfiguration("/**", config);
      return source;
   }

   @Bean
   public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
      http
         .cors(withDefaults()) // ✅ IMPORTANT: enable CORS in Spring Security
         .csrf(csrf -> csrf.disable())
         .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
         .authorizeHttpRequests(auth -> auth

            // ✅ IMPORTANT: allow preflight
            .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

            // ── Web admin auth ────────────────────────────────────
            .requestMatchers("/api/auth/**").permitAll()

            // ── Mobile customer auth ─────────────────────────────
            .requestMatchers("/api/customer/auth/login").permitAll()
            .requestMatchers("/api/customer/auth/signup").permitAll()
            .requestMatchers("/api/customer/auth/profile").authenticated()

            // ── Party GST login (NEW) ─────────────────────────────
            .requestMatchers("/api/party/auth/verify-gst").permitAll()
            .requestMatchers("/api/party/auth/set-password").permitAll()

            // ── Admin & product endpoints (open) ──────────────────
            .requestMatchers("/api/admin/customers/**").permitAll()
            .requestMatchers("/api/admin/products/**").permitAll()
            .requestMatchers("/api/admin/images/**").permitAll()
            .requestMatchers("/api/admin/orders/**").permitAll()

            // ── All existing permitted endpoints ──────────────────
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
            .requestMatchers("/api/recipt/**").permitAll()
            .requestMatchers("/api/production-receipt/**").permitAll()
            .requestMatchers("/api/dispatch-challan/**").permitAll()
            .requestMatchers("/api/payment/payment-mode/**").permitAll()
            .requestMatchers("/api/other-dispatch-challan/**").permitAll()
            .requestMatchers("/api/order-settles/**").permitAll()
            .requestMatchers("/api/customer/auth/admin/**").permitAll()
            .requestMatchers("/api/art-stock-adjustments/**").permitAll()
            .requestMatchers("/api/material-stock-adjustments/**").permitAll()
            .requestMatchers("/api/location/**").permitAll()
            .requestMatchers("/api/purchase/entry-item/**").permitAll()
            .requestMatchers("/api/purchase/orders/**").permitAll()
            .requestMatchers("/api/purchase/return-item/**").permitAll()
            .requestMatchers("/api/purchase/pending-order-item").permitAll()
            .requestMatchers("/api/dispatch-return-challan/**").permitAll()

            // ── Mobile orders — JWT required ───────────────────────
            .requestMatchers("/api/orders/**").authenticated()

            .anyRequest().authenticated()
         )
         .userDetailsService(customUserDetailsService)
         .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

      return http.build();
   }
}
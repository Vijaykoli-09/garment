package com.garment.controller;

import com.garment.DTO.CustomerLoginRequest;
import com.garment.DTO.CustomerLoginResponse;
import com.garment.DTO.AppSignupRequest;
import com.garment.service.CustomerRegistrationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Auth endpoints for the React Native mobile app.
 * Completely separate from your existing web admin auth.
 *
 * POST /api/customer/auth/signup
 * POST /api/customer/auth/login
 */
@RestController
@RequestMapping("/api/customer/auth")
public class CustomerAuthController {

    private final CustomerRegistrationService service;

    public CustomerAuthController(CustomerRegistrationService service) {
        this.service = service;
    }

    // ── Signup ─────────────────────────────────────────────────────
    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody AppSignupRequest req) {
        try {
            String message = service.signup(req);
            return ResponseEntity.ok(Map.of("message", message));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Login ──────────────────────────────────────────────────────
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody CustomerLoginRequest req) {
        try {
            CustomerLoginResponse response = service.login(req);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            String msg = e.getMessage();

            // Return specific error codes the app can handle
            if (msg != null && msg.startsWith("PENDING:")) {
                return ResponseEntity.status(403).body(Map.of(
                        "error", msg,
                        "code", "ACCOUNT_PENDING"
                ));
            }
            if (msg != null && msg.startsWith("REJECTED:")) {
                return ResponseEntity.status(403).body(Map.of(
                        "error", msg,
                        "code", "ACCOUNT_REJECTED"
                ));
            }

            return ResponseEntity.status(401).body(Map.of(
                    "error", msg,
                    "code", "INVALID_CREDENTIALS"
            ));
        }
    }
}
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
 * GET  /api/customer/auth/profile
 * PUT  /api/admin/customers/{customerId}/link-party?partyId=123
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

    // ── Profile (called silently on app launch to refresh credit settings) ──
    // Returns fresh creditEnabled / creditLimit / advanceOption / partyId from DB.
    // This lets the app pick up admin changes without requiring re-login.
    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(java.security.Principal principal) {
        try {
            CustomerLoginResponse profile = service.getProfile(principal.getName());
            return ResponseEntity.ok(profile);
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }

    // ── Link Party (admin only) ────────────────────────────────────
    // After admin creates a party in PartyCreation, they call this to
    // link that party's ID to the customer. The app picks it up on next
    // profile refresh (app launch) via GET /profile above.
    //
    // PUT /api/admin/customers/{customerId}/link-party?partyId=123
    @PutMapping("/admin/customers/{customerId}/link-party")
    public ResponseEntity<?> linkParty(
            @PathVariable Long customerId,
            @RequestParam Long partyId
    ) {
        try {
            service.linkParty(customerId, partyId);
            return ResponseEntity.ok(Map.of(
                    "message", "Party linked successfully",
                    "customerId", customerId,
                    "partyId", partyId
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
package com.garment.controller;

import com.garment.service.PartyAuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * PartyAuthController
 *
 * Two public endpoints for the React Native "Party Login with GST" flow.
 *
 * POST /api/party/auth/verify-gst
 *   – Checks gstNo in the Party table
 *   – Returns partyId, partyName, phone if found
 *   – Returns 404 GST_NOT_FOUND if not found
 *   – Returns 409 ALREADY_REGISTERED if party already has a password
 *
 * POST /api/party/auth/set-password
 *   – Sets BCrypt password on the Party record
 *   – Also creates a CustomerRegistration row (APPROVED, linked to partyId)
 *     so the existing /customer/auth/login endpoint works unchanged
 *   – Returns 200 on success
 *
 * Both endpoints are PUBLIC — added to SecurityConfig permitAll list.
 *
 * Place this file at: src/main/java/com/garment/controller/PartyAuthController.java
 */
@RestController
@RequestMapping("/api/party/auth")
@CrossOrigin(originPatterns = "*")public class PartyAuthController {

    private final PartyAuthService partyAuthService;

    public PartyAuthController(PartyAuthService partyAuthService) {
        this.partyAuthService = partyAuthService;
    }

    // ── Step 1: Verify GST ─────────────────────────────────────────
    @PostMapping("/verify-gst")
    public ResponseEntity<?> verifyGst(@RequestBody Map<String, String> body) {
        String gstNo = body.get("gstNo");
        if (gstNo == null || gstNo.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "gstNo is required"));
        }
        try {
            Map<String, Object> result = partyAuthService.verifyGst(gstNo.trim().toUpperCase());
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            String msg  = e.getMessage();
            String code = msg.contains(":") ? msg.split(":")[0] : "ERROR";
            String text = msg.contains(":") ? msg.substring(msg.indexOf(':') + 1).trim() : msg;

            int status = switch (code) {
                case "GST_NOT_FOUND"      -> 404;
                case "ALREADY_REGISTERED" -> 409;
                default                   -> 400;
            };
            return ResponseEntity.status(status)
                    .body(Map.of("code", code, "error", text));
        }
    }

    // ── Step 2: Set Password ───────────────────────────────────────
    @PostMapping("/set-password")
    public ResponseEntity<?> setPassword(@RequestBody Map<String, Object> body) {
       Object partyIdObj = body.get("partyId");
String password   = (String) body.get("password");
String phone      = (String) body.get("phone");

        if (partyIdObj == null || password == null || password.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "partyId and password are required"));
        }

        Long partyId;
        try {
            partyId = Long.parseLong(partyIdObj.toString());
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Invalid partyId"));
        }

        try {
           partyAuthService.setPassword(partyId, password, phone);
            return ResponseEntity.ok(Map.of("message", "Password set. You can now login."));
        } catch (RuntimeException e) {
            String msg  = e.getMessage();
            String code = msg.contains(":") ? msg.split(":")[0] : "ERROR";
            String text = msg.contains(":") ? msg.substring(msg.indexOf(':') + 1).trim() : msg;

            int status = switch (code) {
                case "PARTY_NOT_FOUND"    -> 404;
                case "ALREADY_REGISTERED" -> 409;
                default                   -> 400;
            };
            return ResponseEntity.status(status)
                    .body(Map.of("code", code, "error", text));
        }
    }
}
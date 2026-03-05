package com.garment.controller;

import com.garment.DTO.ApproveCustomerRequest;
import com.garment.DTO.UpdateCustomerRequest;
import com.garment.entity.CustomerRegistration;
import com.garment.service.CustomerRegistrationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*; 

import java.util.List;
import java.util.Map;

/**
 * Admin endpoints for the React web dashboard (CustomerRequests.tsx).
 *
 * GET    /api/admin/customers              → list all (optional ?status=PENDING)
 * POST   /api/admin/customers/{id}/approve → approve with credit config
 * POST   /api/admin/customers/{id}/reject  → reject
 */
@RestController
@RequestMapping("/api/admin/customers")
public class AdminCustomerController {

    private final CustomerRegistrationService service;

    public AdminCustomerController(CustomerRegistrationService service) {
        this.service = service;
    }

    // ── List all customers (filter by ?status=PENDING / APPROVED / REJECTED) ──
    @GetMapping
    public ResponseEntity<List<CustomerRegistration>> getAll(
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(service.getAllCustomers(status));
    }

    // ── Get single customer ────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        return service.getAllCustomers(null).stream()
                .filter(c -> c.getId().equals(id))
                .findFirst()
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ── Approve with payment config ────────────────────────────────
    @PostMapping("/{id}/approve")
    public ResponseEntity<?> approve(@PathVariable Long id,
                                     @RequestBody ApproveCustomerRequest req) {
        try {
            CustomerRegistration updated = service.approveCustomer(id, req);
            return ResponseEntity.ok(Map.of(
                    "message", "Customer approved successfully.",
                    "customer", updated
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Reject ─────────────────────────────────────────────────────
    @PostMapping("/{id}/reject")
    public ResponseEntity<?> reject(@PathVariable Long id) {
        try {
            CustomerRegistration updated = service.rejectCustomer(id);
            return ResponseEntity.ok(Map.of(
                    "message", "Customer rejected.",
                    "customer", updated
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/update")
public ResponseEntity<?> update(@PathVariable Long id,
                                @RequestBody UpdateCustomerRequest req) {
    try {
        CustomerRegistration updated = service.updateCustomer(id, req);
        return ResponseEntity.ok(Map.of(
                "message", "Customer updated successfully.",
                "customer", updated
        ));
    } catch (RuntimeException e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
}}
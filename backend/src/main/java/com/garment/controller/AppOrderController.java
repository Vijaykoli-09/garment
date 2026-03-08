package com.garment.controller;

import com.garment.DTO.AppRazorpayOrderRequest;
import com.garment.DTO.AppVerifyPaymentRequest;
import com.garment.DTO.AppOrderResponse;
import com.garment.service.AppOrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import com.garment.entity.AppOrder;
import java.util.Map;

/**
 * Order & Payment endpoints for the React Native app.
 *
 * POST /api/orders/create-razorpay-order  — Step 1: create order + get Razorpay order ID
 * POST /api/orders/verify-payment         — Step 2: verify payment after Razorpay callback
 * GET  /api/orders/my                     — Customer's own order list
 * GET  /api/orders/{id}                   — Single order detail
 */
@RestController
@RequestMapping("/api/orders")
public class AppOrderController {

    private final AppOrderService ApporderService;

    public AppOrderController(AppOrderService ApporderService) {
        this.ApporderService = ApporderService;
    }

    // ── Step 1: Create Razorpay order ──────────────────────────────
    @PostMapping("/create-razorpay-order")
    public ResponseEntity<?> createRazorpayOrder(@RequestBody AppRazorpayOrderRequest req,
                                                  Principal principal) {
        try {
            // principal.getName() returns the phone (JWT subject from JwtUtil)
            return ResponseEntity.ok(ApporderService.createRazorpayOrder(principal.getName(), req));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Step 2: Verify payment signature ──────────────────────────
    @PostMapping("/verify-payment")
    public ResponseEntity<?> verifyPayment(@RequestBody AppVerifyPaymentRequest req) {
        try {
            return ResponseEntity.ok(ApporderService.verifyPayment(req));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── My orders list ─────────────────────────────────────────────
    @GetMapping("/my")
    public ResponseEntity<?> getMyOrders(Principal principal) {
        try {
            List<AppOrderResponse> orders = ApporderService.getMyOrders(principal.getName());
            return ResponseEntity.ok(orders);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Single order detail ────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<?> getOrderById(@PathVariable Long id, Principal principal) {
        try {
            return ResponseEntity.ok(ApporderService.getOrderById(id, principal.getName()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
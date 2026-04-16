package com.garment.controller;

import com.garment.DTO.AppRazorpayOrderRequest;
import com.garment.DTO.AppVerifyPaymentRequest;
import com.garment.DTO.AppVerifyCreditPaymentRequest;
import com.garment.DTO.AppOrderResponse;
import com.garment.service.AppOrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

/**
 * POST /api/orders/create-razorpay-order      — create order + Razorpay order ID
 * POST /api/orders/verify-payment             — verify Razorpay payment signature
 * GET  /api/orders/my                         — customer's own order list
 * GET  /api/orders/{id}                       — single order detail
 *
 * POST /api/orders/{id}/pay-credit            — NEW: create Razorpay order for credit amount
 * POST /api/orders/verify-credit-payment      — NEW: verify + mark credit order as PAID
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

    // ════════════════════════════════════════════════════════════════
    // CREDIT PAYMENT — Step 1
    // Creates a Razorpay order for the pending credit amount.
    // Called when customer taps "Pay Credit Amount" in Order History.
    // Returns: { orderId, razorpayOrderId, razorpayKeyId, creditAmount }
    // ════════════════════════════════════════════════════════════════
    @PostMapping("/{id}/pay-credit")
    public ResponseEntity<?> createCreditPaymentOrder(@PathVariable Long id,
                                                       Principal principal) {
        try {
            return ResponseEntity.ok(
                ApporderService.createCreditPaymentOrder(id, principal.getName())
            );
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ════════════════════════════════════════════════════════════════
    // CREDIT PAYMENT — Step 2
    // Verifies the Razorpay signature, marks order PAID, sets paidAt.
    // Returns: { order: <full AppOrderResponse> }
    // ════════════════════════════════════════════════════════════════
    @PostMapping("/verify-credit-payment")
    public ResponseEntity<?> verifyCreditPayment(@RequestBody AppVerifyCreditPaymentRequest req) {
        try {
            return ResponseEntity.ok(ApporderService.verifyCreditPayment(req));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
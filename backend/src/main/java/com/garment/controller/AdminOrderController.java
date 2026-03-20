package com.garment.controller;

import com.garment.DTO.AppOrderResponse;
import com.garment.entity.AppOrder.OrderStatus;
import com.garment.entity.AppOrder.PaymentStatus;
import com.garment.repository.AppOrderRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Admin-only order endpoints for the web dashboard.
 *
 * GET /api/admin/orders            — all orders (newest first)
 * GET /api/admin/orders?status=PENDING   — filter by orderStatus
 * GET /api/admin/orders?payment=PAID     — filter by paymentStatus
 * GET /api/admin/orders/{id}       — single order detail
 * POST /api/admin/orders/{id}/status — update order status (accept/reject/ship etc.)
 *
 * SecurityConfig already has .requestMatchers("/api/admin/orders/**").permitAll()
 * so no auth changes needed.
 */
@RestController
@RequestMapping("/api/admin/orders")
public class AdminOrderController {

    private final AppOrderRepository orderRepo;

    public AdminOrderController(AppOrderRepository orderRepo) {
        this.orderRepo = orderRepo;
    }

    // ── GET all orders — with optional filters ────────────────────
    @GetMapping
    public ResponseEntity<?> getAllOrders(
            @RequestParam(required = false) String status,   // orderStatus enum name
            @RequestParam(required = false) String payment   // paymentStatus enum name
    ) {
        try {
            List<AppOrderResponse> orders;

            if (status != null && !status.isBlank()) {
                OrderStatus os = OrderStatus.valueOf(status.toUpperCase());
                orders = orderRepo.findByOrderStatusOrderByCreatedAtDesc(os)
                        .stream().map(AppOrderResponse::from).collect(Collectors.toList());

            } else if (payment != null && !payment.isBlank()) {
                PaymentStatus ps = PaymentStatus.valueOf(payment.toUpperCase());
                orders = orderRepo.findByPaymentStatusOrderByCreatedAtDesc(ps)
                        .stream().map(AppOrderResponse::from).collect(Collectors.toList());

            } else {
                orders = orderRepo.findAllByOrderByCreatedAtDesc()
                        .stream().map(AppOrderResponse::from).collect(Collectors.toList());
            }

            return ResponseEntity.ok(orders);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid filter value: " + e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    // ── GET single order ─────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<?> getOrder(@PathVariable Long id) {
        return orderRepo.findById(id)
                .<ResponseEntity<?>>map(o -> ResponseEntity.ok(AppOrderResponse.from(o)))
                .orElse(ResponseEntity.notFound().build());
    }

    // ── UPDATE order status ───────────────────────────────────────
    // Body: { "status": "ACCEPTED" }   (any OrderStatus enum value)
    @PostMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        try {
            var order = orderRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("Order not found: " + id));

            String statusStr = body.get("status");
            if (statusStr == null || statusStr.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "status field is required"));
            }

            OrderStatus newStatus = OrderStatus.valueOf(statusStr.toUpperCase());
            order.setOrderStatus(newStatus);
            order.setUpdatedAt(java.time.LocalDateTime.now());
            orderRepo.save(order);

            return ResponseEntity.ok(AppOrderResponse.from(order));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Invalid status. Valid values: PENDING, ACCEPTED, PROCESSING, SHIPPED, DELIVERED, CANCELLED"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
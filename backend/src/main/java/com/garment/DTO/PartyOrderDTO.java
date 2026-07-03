package com.garment.DTO;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Unified order row for the broker "party orders" screen.
 * Represents EITHER a web SaleOrder OR an app AppOrder — the `source`
 * field tells you which. Kept deliberately flat/simple since it's a
 * list view; hit the existing /api/sale-orders/{id} or /api/orders/{id}
 * endpoints (using `id` + `source`) if you need full order detail later.
 */
@Data @NoArgsConstructor @AllArgsConstructor
public class PartyOrderDTO {
    private Long id;
    private String source;        // "WEB" | "APP"
    private String orderNo;       // SaleOrder.orderNo, or "APP-{id}" for app orders
    private LocalDate date;       // SaleOrder.dated, or AppOrder.createdAt.toLocalDate()
    private Double amount;        // WEB: sum(qty * rate) across all rows/sizes. APP: totalAmount.
    private String status;        // null for WEB, AppOrder.orderStatus for APP
    private String paymentStatus; // null for WEB, AppOrder.paymentStatus for APP
    private Integer totalPeti;    // WEB only
    private Integer totalPcs;     // WEB only
}
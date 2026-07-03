package com.garment.controller;

import com.garment.DTO.PartyOrderDTO;
import com.garment.service.PartyOrderService;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * GET /api/party/{partyId}/orders
 * GET /api/party/{partyId}/orders?fromDate=2026-07-01&toDate=2026-07-03
 *
 * Returns every order (web SaleOrder + app AppOrder) placed by this
 * party, merged into one list, newest first. Used by the broker app's
 * "party detail" screen.
 */
@RestController
@RequestMapping("/api/party")
@CrossOrigin(originPatterns = "*")
public class PartyOrderController {

    private final PartyOrderService svc;

    public PartyOrderController(PartyOrderService svc) {
        this.svc = svc;
    }

    @GetMapping("/{partyId}/orders")
    public List<PartyOrderDTO> getOrders(
            @PathVariable Long partyId,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate
    ) {
        LocalDate from = (fromDate != null && !fromDate.isBlank()) ? LocalDate.parse(fromDate) : null;
        LocalDate to   = (toDate   != null && !toDate.isBlank())   ? LocalDate.parse(toDate)   : null;
        return svc.getOrdersForParty(partyId, from, to);
    }
}
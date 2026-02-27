package com.garment.controller;

import com.garment.DTO.PurchasePendingRequest;
import com.garment.DTO.PurchasePendingRowDTO;
import com.garment.service.PurchasePendingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/purchase-orders")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class PurchasePendingController {

    private final PurchasePendingService service;

    // -------- Filter lists --------
    @GetMapping("/parties")
    public ResponseEntity<List<Map<String, Object>>> parties() {
        List<Map<String, Object>> list = service.getFilterParties().stream()
            .map(a -> {
                Map<String, Object> m = new HashMap<>();
                m.put("id", ((Number) a[0]).longValue());
                m.put("partyName", (String) a[1]);
                return m;
            })
            .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/items")
    public ResponseEntity<List<Map<String, Object>>> items() {
        List<Map<String, Object>> list = service.getFilterItems().stream()
            .map(a -> {
                Map<String, Object> m = new HashMap<>();
                m.put("id", ((Number) a[0]).longValue());
                m.put("itemName", (String) a[1]); // FE expects itemName
                return m;
            })
            .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    // -------- Report --------
    @PostMapping("/pending-report")
    public ResponseEntity<List<PurchasePendingRowDTO>> pending(
            @RequestBody PurchasePendingRequest req) {
        return ResponseEntity.ok(service.getPending(req));
    }
}

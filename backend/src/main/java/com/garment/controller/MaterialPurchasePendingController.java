package com.garment.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.garment.DTO.MaterialPurchasePendingRequest;
import com.garment.DTO.MaterialPurchasePendingRowDTO;
import com.garment.service.MaterialPurchasePendingService;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
// @CrossOrigin(origins = "http://localhost:3000")
@CrossOrigin(originPatterns = "*")
@RequestMapping("/api/purchase")

public class MaterialPurchasePendingController {

    private final MaterialPurchasePendingService service;

    @GetMapping("/order-list")
public ResponseEntity<List<Map<String, Object>>> orderItems() {

    List<Object[]> raw = service.getMaterials();

    if (!raw.isEmpty()) {
        System.out.println("getMaterials()[0] = " + java.util.Arrays.toString(raw.get(0)));
    }

    List<Map<String, Object>> list = raw.stream()
        .map(a -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", ((Number) a[0]).longValue());

            // safer conversion (prevents blank due to non-string types)
            m.put("itemName", a.length > 1 && a[1] != null ? a[1].toString() : "");

            return m;
        })
        .toList();

    return ResponseEntity.ok(list);
}
    // React calls: POST /purchase/pending-order-item
    @PostMapping("/pending-order-item")
    public ResponseEntity<Object> pending(@RequestBody MaterialPurchasePendingRequest req) {
        return ResponseEntity.ok(service.getPending(req));
    }
}
package com.garment.controller;

import com.garment.DTO.MaterialStockAdjustmentRequest;
import com.garment.model.MaterialStockAdjustment;
import com.garment.repository.MaterialStockAdjustmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/material-stock-adjustments")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class MaterialStockAdjustmentController {

    private final MaterialStockAdjustmentRepository repo;

    @PostMapping
    public ResponseEntity<?> create(@RequestBody MaterialStockAdjustmentRequest req) {
        try {
            String adjDateStr = req.getAdjDate() == null ? "" : req.getAdjDate().trim();
            Long groupId = req.getMaterialGroupId();
            Long materialId = req.getMaterialId();

            if (adjDateStr.isEmpty() || groupId == null || groupId == 0 || materialId == null || materialId == 0) {
                return ResponseEntity.badRequest().body("Missing required fields (adjDate, materialGroupId, materialId)");
            }

            LocalDate adjDate;
            try {
                adjDate = LocalDate.parse(adjDateStr);
            } catch (Exception e) {
                return ResponseEntity.badRequest().body("Invalid adjDate format. Use YYYY-MM-DD");
            }

            BigDecimal qtyDelta = req.getQtyDelta() == null ? BigDecimal.ZERO : req.getQtyDelta();

            MaterialStockAdjustment m = MaterialStockAdjustment.builder()
                    .adjDate(adjDate)
                    .materialGroupId(groupId)
                    .materialId(materialId)
                    .shadeName(trimToNull(req.getShadeName()))
                    .qtyDelta(qtyDelta)
                    .remarks(trimToNull(req.getRemarks()))
                    .build();

            return ResponseEntity.status(HttpStatus.CREATED).body(repo.save(m));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Save failed: " + e.getMessage());
        }
    }

    @GetMapping
    public List<MaterialStockAdjustment> list(
            @RequestParam(required = false) String toDate,
            @RequestParam(defaultValue = "5000") int limit
    ) {
        LocalDate t = (toDate == null || toDate.isBlank()) ? LocalDate.now() : LocalDate.parse(toDate.trim());
        int safeLimit = Math.max(1, Math.min(limit, 10000));

        return repo.findByAdjDateLessThanEqual(
                t,
                PageRequest.of(0, safeLimit, Sort.by(Sort.Direction.DESC, "id"))
        ).getContent();
    }

    private String trimToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
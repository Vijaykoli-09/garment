package com.garment.controller;

import com.garment.model.MaterialStockAdjustment;
import com.garment.repository.MaterialStockAdjustmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/material-stock-adjustments")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class MaterialStockAdjustmentController {

    private final MaterialStockAdjustmentRepository repo;

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        try {
            String adjDate = String.valueOf(body.getOrDefault("adjDate", "")).trim();
            Long groupId = Long.valueOf(String.valueOf(body.getOrDefault("materialGroupId", "0")));
            Long materialId = Long.valueOf(String.valueOf(body.getOrDefault("materialId", "0")));
            BigDecimal qtyDelta = new BigDecimal(String.valueOf(body.getOrDefault("qtyDelta", "0")));

            if (adjDate.isEmpty() || groupId == 0 || materialId == 0) {
                return ResponseEntity.badRequest().body("Missing required fields");
            }

            MaterialStockAdjustment m = MaterialStockAdjustment.builder()
                    .adjDate(LocalDate.parse(adjDate))
                    .materialGroupId(groupId)
                    .materialId(materialId)
                    .shadeName(getStr(body, "shadeName"))
                    .qtyDelta(qtyDelta)
                    .remarks(getStr(body, "remarks"))
                    .build();

            return ResponseEntity.status(HttpStatus.CREATED).body(repo.save(m));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Save failed: " + e.getMessage());
        }
    }

    // ✅ Stock show ke liye GET
    @GetMapping
    public List<MaterialStockAdjustment> list(
            @RequestParam(required = false) String toDate,
            @RequestParam(defaultValue = "5000") int limit
    ) {
        LocalDate t = (toDate == null || toDate.isBlank()) ? LocalDate.now() : LocalDate.parse(toDate);
        int safeLimit = Math.max(1, Math.min(limit, 10000));

        List<MaterialStockAdjustment> rows = repo.findByAdjDateLessThanEqual(
                t, Sort.by(Sort.Direction.DESC, "id")
        );
        return rows.size() > safeLimit ? rows.subList(0, safeLimit) : rows;
    }

    private String getStr(Map<String,Object> b, String k){
        Object v = b.get(k);
        if(v==null) return null;
        String s = v.toString().trim();
        return s.isEmpty()? null : s;
    }
}
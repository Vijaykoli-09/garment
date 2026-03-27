package com.garment.controller;

import com.garment.model.ArtStockAdjustment;
import com.garment.repository.ArtStockAdjustmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/art-stock-adjustments")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class ArtStockAdjustmentController {

    private final ArtStockAdjustmentRepository repo;

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        try {
            String adjDate = String.valueOf(body.getOrDefault("adjDate", "")).trim();
            String artNo = String.valueOf(body.getOrDefault("artNo", "")).trim();
            String shadeName = String.valueOf(body.getOrDefault("shadeName", "")).trim();
            String sizeName = String.valueOf(body.getOrDefault("sizeName", "")).trim();

            if (adjDate.isEmpty() || artNo.isEmpty() || shadeName.isEmpty() || sizeName.isEmpty()) {
                return ResponseEntity.badRequest().body("Missing required fields");
            }

            BigDecimal pcsDelta = new BigDecimal(String.valueOf(body.getOrDefault("pcsDelta", "0")));

            ArtStockAdjustment a = ArtStockAdjustment.builder()
                    .adjDate(LocalDate.parse(adjDate)) // YYYY-MM-DD
                    .artSerial(getStr(body, "artSerial"))
                    .artGroup(getStr(body, "artGroup"))
                    .artNo(artNo)
                    .artName(getStr(body, "artName"))
                    .shadeCode(getStr(body, "shadeCode"))
                    .shadeName(shadeName)
                    .sizeSerial(getStr(body, "sizeSerial"))
                    .sizeName(sizeName)
                    .pcsDelta(pcsDelta)
                    .perBox(getBD(body, "perBox"))
                    .rate(getBD(body, "rate"))
                    .remarks(getStr(body, "remarks"))
                    .build();

            return ResponseEntity.status(HttpStatus.CREATED).body(repo.save(a));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Save failed: " + e.getMessage());
        }
    }

    // ✅ Stock show ke liye GET (frontend yahi use karega)
    @GetMapping
    public List<ArtStockAdjustment> list(
            @RequestParam(required = false) String toDate,
            @RequestParam(defaultValue = "5000") int limit
    ) {
        LocalDate t = (toDate == null || toDate.isBlank()) ? LocalDate.now() : LocalDate.parse(toDate);
        int safeLimit = Math.max(1, Math.min(limit, 10000));

        List<ArtStockAdjustment> rows = repo.findByAdjDateLessThanEqual(
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
    private BigDecimal getBD(Map<String,Object> b, String k){
        Object v = b.get(k);
        if(v==null) return null;
        String s = v.toString().trim();
        if(s.isEmpty()) return null;
        return new BigDecimal(s);
    }
}
package com.garment.controller;

import com.garment.DTO.ArtStockAdjustmentRequest;
import com.garment.model.ArtStockAdjustment;
import com.garment.repository.ArtStockAdjustmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/art-stock-adjustments")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class ArtStockAdjustmentController {

    private final ArtStockAdjustmentRepository repo;

    @PostMapping
    public ResponseEntity<?> create(@RequestBody ArtStockAdjustmentRequest req) {
        try {
            String adjDateStr = req.getAdjDate() == null ? "" : req.getAdjDate().trim();
            String artNo = req.getArtNo() == null ? "" : req.getArtNo().trim();
            String shadeName = req.getShadeName() == null ? "" : req.getShadeName().trim();
            String sizeName = req.getSizeName() == null ? "" : req.getSizeName().trim();

            if (adjDateStr.isEmpty() || artNo.isEmpty() || shadeName.isEmpty() || sizeName.isEmpty()) {
                return ResponseEntity.badRequest().body("Missing required fields (adjDate, artNo, shadeName, sizeName)");
            }

            LocalDate adjDate;
            try {
                adjDate = LocalDate.parse(adjDateStr);
            } catch (Exception e) {
                return ResponseEntity.badRequest().body("Invalid adjDate format. Use YYYY-MM-DD");
            }

            BigDecimal pcsDelta = req.getPcsDelta() == null ? BigDecimal.ZERO : req.getPcsDelta();

            ArtStockAdjustment a = ArtStockAdjustment.builder()
                    .adjDate(adjDate)
                    .artSerial(trimToNull(req.getArtSerial()))
                    .artGroup(trimToNull(req.getArtGroup()))
                    .artNo(artNo)
                    .artName(trimToNull(req.getArtName()))
                    .shadeCode(trimToNull(req.getShadeCode()))
                    .shadeName(shadeName)
                    .sizeSerial(trimToNull(req.getSizeSerial()))
                    .sizeName(sizeName)
                    .pcsDelta(pcsDelta)
                    .perBox(req.getPerBox())
                    .rate(req.getRate())
                    .remarks(trimToNull(req.getRemarks()))
                    .build();

            return ResponseEntity.status(HttpStatus.CREATED).body(repo.save(a));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Save failed: " + e.getMessage());
        }
    }

    @GetMapping
    public List<ArtStockAdjustment> list(
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
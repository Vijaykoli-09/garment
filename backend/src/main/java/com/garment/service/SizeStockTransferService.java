package com.garment.service;

import com.garment.DTO.SizeStockTransferRequest;
import com.garment.DTO.SizeStockTransferResponse;
import com.garment.model.ArtStockAdjustment;
import com.garment.repository.ArtStockAdjustmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SizeStockTransferService {

    private final ArtStockAdjustmentRepository repo;

    @Transactional
    public SizeStockTransferResponse create(SizeStockTransferRequest req) {

        // ----- validations -----
        if (isBlank(req.getAdjDate()) || isBlank(req.getArtNo()) || isBlank(req.getShadeName())
                || isBlank(req.getFromSizeName()) || isBlank(req.getToSizeName())) {
            throw new IllegalArgumentException("Missing required fields (adjDate, artNo, shadeName, fromSizeName, toSizeName)");
        }

        if (req.getFromSizeName().trim().equalsIgnoreCase(req.getToSizeName().trim())) {
            throw new IllegalArgumentException("From Size and To Size cannot be same");
        }

        BigDecimal qty = req.getQty();
        if (qty == null) qty = BigDecimal.ZERO;

        if (qty.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Qty must be > 0");
        }

        LocalDate adjDate = LocalDate.parse(req.getAdjDate().trim());

        String ref = (isBlank(req.getRef()) ? ("SIZTRF-" + System.currentTimeMillis()) : req.getRef().trim());

        String remarks = (req.getRemarks() == null ? "" : req.getRemarks().trim());
        String baseRem = "[" + ref + "] " + (remarks.isBlank() ? "" : (remarks + " "));

        // ----- create OUT row -----
        ArtStockAdjustment out = ArtStockAdjustment.builder()
                .adjDate(adjDate)
                .artSerial(nullIfBlank(req.getArtSerial()))
                .artGroup(nullIfBlank(req.getArtGroup()))
                .artNo(req.getArtNo().trim())
                .artName(nullIfBlank(req.getArtName()))
                .shadeCode(nullIfBlank(req.getShadeCode()))
                .shadeName(req.getShadeName().trim())
                .sizeSerial(nullIfBlank(req.getFromSizeSerial()))
                .sizeName(req.getFromSizeName().trim())
                .pcsDelta(qty.negate())
                .perBox(req.getPerBox())
                .rate(req.getRate())
                .remarks((baseRem + "SIZE OUT -> " + req.getToSizeName().trim()).trim())
                .build();

        // ----- create IN row -----
        ArtStockAdjustment in = ArtStockAdjustment.builder()
                .adjDate(adjDate)
                .artSerial(nullIfBlank(req.getArtSerial()))
                .artGroup(nullIfBlank(req.getArtGroup()))
                .artNo(req.getArtNo().trim())
                .artName(nullIfBlank(req.getArtName()))
                .shadeCode(nullIfBlank(req.getShadeCode()))
                .shadeName(req.getShadeName().trim())
                .sizeSerial(nullIfBlank(req.getToSizeSerial()))
                .sizeName(req.getToSizeName().trim())
                .pcsDelta(qty)
                .perBox(req.getPerBox())
                .rate(req.getRate())
                .remarks((baseRem + "SIZE IN <- " + req.getFromSizeName().trim()).trim())
                .build();

        List<ArtStockAdjustment> saved = repo.saveAll(List.of(out, in));

        // saveAll returns saved entities (with ids)
        ArtStockAdjustment savedOut = saved.get(0);
        ArtStockAdjustment savedIn = saved.get(1);

        return SizeStockTransferResponse.builder()
                .ref(ref)
                .outRow(savedOut)
                .inRow(savedIn)
                .build();
    }

    private boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private String nullIfBlank(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
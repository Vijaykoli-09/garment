package com.garment.controller;

import java.util.List;
import java.util.Arrays;

import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import com.garment.DTO.OrderSettleDTO;
import com.garment.DTO.OrderSettleListDTO;
import com.garment.DTO.OrderSettlePendencySummaryDTO;
import com.garment.DTO.PagedResponse;
import com.garment.service.OrderSettleService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/order-settles")    // IMPORTANT: must NOT be "/api/sale-orders"
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class OrderSettleController {

    private final OrderSettleService svc;

    @GetMapping
    public List<OrderSettleDTO> list() {
        return svc.list();
    }

    @GetMapping("/paged")
    public PagedResponse<OrderSettleListDTO> listPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search) {
        return svc.listPaged(page, size, search);
    }

    @GetMapping("/pendency-summary")
    public List<OrderSettlePendencySummaryDTO> pendencySummary(
            @RequestParam Long partyId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate fromDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate toDate,
            @RequestParam String artNos) {
        List<String> normalizedArtNos = Arrays.stream(artNos.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .map(String::toUpperCase)
                .distinct()
                .toList();
        return svc.pendencySummary(partyId, fromDate, toDate, normalizedArtNos);
    }

    @GetMapping("/{id}")
    public OrderSettleDTO get(@PathVariable Long id) {
        return svc.get(id);
    }

    @PostMapping
    public OrderSettleDTO create(@RequestBody OrderSettleDTO dto) {
        return svc.create(dto);
    }

    @PutMapping("/{id}")
    public OrderSettleDTO update(@PathVariable Long id, @RequestBody OrderSettleDTO dto) {
        return svc.update(id, dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        svc.delete(id);
        return ResponseEntity.noContent().build();
    }
}
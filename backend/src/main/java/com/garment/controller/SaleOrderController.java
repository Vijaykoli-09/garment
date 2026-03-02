package com.garment.controller;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.garment.DTO.SaleOrderDTO;
import com.garment.DTO.SaleOrderPendencyRowDTO;
import com.garment.DTO.SaleOrderSaveDTO;
import com.garment.service.SaleOrderService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/sale-orders")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class SaleOrderController {

    private final SaleOrderService svc;

    @GetMapping("/next-order-no")
    public ResponseEntity<String> nextOrderNo() {
        return ResponseEntity.ok(svc.nextOrderNo());
    }

    @PostMapping
    public SaleOrderDTO create(@RequestBody SaleOrderSaveDTO dto) {
        return svc.create(dto);
    }

    @PutMapping("/{id}")
    public SaleOrderDTO update(@PathVariable Long id, @RequestBody SaleOrderSaveDTO dto) {
        return svc.update(id, dto);
    }

    @GetMapping("/{id}")
    public SaleOrderDTO get(@PathVariable Long id) {
        return svc.get(id);
    }

    @GetMapping
    public List<SaleOrderDTO> list() {
        return svc.list();
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        svc.delete(id);
    }

    // Sale Order Pendency API
    @GetMapping("/pendency")
    public List<SaleOrderPendencyRowDTO> pendency(
            @RequestParam String fromDate,
            @RequestParam String toDate,
            @RequestParam(required = false) String destinations,
            @RequestParam(required = false) String partyIds,
            @RequestParam(required = false) String artNos,
            @RequestParam(required = false) String sizes
    ) {
        LocalDate from = LocalDate.parse(fromDate);
        LocalDate to   = LocalDate.parse(toDate);

        List<String> destList   = csvToList(destinations, true); // UPPER
        List<Long>   partyList  = csvToLongList(partyIds);
        List<String> artNoList  = csvToList(artNos, false);      // lower
        List<String> sizeList   = csvToList(sizes, true);        // UPPER

        return svc.pendency(from, to, destList, partyList, artNoList, sizeList);
    }

    private static List<String> csvToList(String csv, boolean upper) {
        if (csv == null || csv.trim().isEmpty()) return List.of();
        return Arrays.stream(csv.split(","))
                .map(s -> upper ? s.trim().toUpperCase() : s.trim().toLowerCase())
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }

    private static List<Long> csvToLongList(String csv) {
        if (csv == null || csv.trim().isEmpty()) return List.of();
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(Long::valueOf)
                .collect(Collectors.toList());
    }
}
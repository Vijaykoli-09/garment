package com.garment.controller;

import com.garment.DTO.CuttingEntryDTO;
import com.garment.DTO.CuttingEntryListDTO;
import com.garment.DTO.CuttingLotDuplicateRequestDTO;
import com.garment.DTO.CuttingStockConsumptionDTO;
import com.garment.DTO.PagedResponse;
import com.garment.service.CuttingEntryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/cutting-entries")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000"}, allowCredentials = "true")
public class CuttingEntryController {

    private final CuttingEntryService service;

    @GetMapping("/next-serial")
    public String nextSerial(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return service.nextSerial(date);
    }

    @GetMapping
    public List<CuttingEntryDTO> list() {
        return service.list();
    }

    @GetMapping("/paged")
    public PagedResponse<CuttingEntryListDTO> listPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search) {
        Page<CuttingEntryListDTO> result = service.listPaged(page, size, search);
        return PagedResponse.of(result);
    }

    @GetMapping("/stock-consumption-summary")
    public List<CuttingStockConsumptionDTO> stockConsumptionSummary() {
        return service.stockConsumptionSummary();
    }

    @PostMapping("/duplicate-lots")
    public List<String> duplicateLots(@RequestBody CuttingLotDuplicateRequestDTO request) {
        return service.findDuplicateLotNumbers(request.getSerialNo(), request.getLotNos());
    }

    @GetMapping("/{serialNo}")
    public CuttingEntryDTO get(@PathVariable String serialNo) {
        return service.get(serialNo);
    }

    @PostMapping
    public CuttingEntryDTO create(@RequestBody CuttingEntryDTO dto) {
        return service.create(dto);
    }

    @PutMapping("/{serialNo}")
    public CuttingEntryDTO update(@PathVariable String serialNo, @RequestBody CuttingEntryDTO dto) {
        return service.update(serialNo, dto);
    }

    @DeleteMapping("/{serialNo}")
    public void delete(@PathVariable String serialNo) {
        service.delete(serialNo);
    }
}
package com.garment.controller;

import com.garment.DTO.CuttingEntryDTO;
import com.garment.service.CuttingEntryService;
import lombok.RequiredArgsConstructor;
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
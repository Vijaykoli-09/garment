package com.garment.controller;

import com.garment.DTO.KnittingOutwardChallanDTO;
import com.garment.model.KnittingOutwardChallan;
import com.garment.service.KnittingOutwardChallanService;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api/knitting-outward-challan")
public class KnittingOutwardChallanController {

    private final KnittingOutwardChallanService service;

    public KnittingOutwardChallanController(KnittingOutwardChallanService service) {
        this.service = service;
    }

    // ✅ Get all challans
    @GetMapping
    public List<KnittingOutwardChallan> getAll() {
        return service.getAllEntries();
    }

    // ✅ Get one challan by ID
    @GetMapping("/{id}")
    public KnittingOutwardChallan getById(@PathVariable Long id) {
        return service.getEntry(id);
    }

    // ✅ Create new challan
    @PostMapping
    public KnittingOutwardChallan create(@RequestBody KnittingOutwardChallanDTO dto) {
        return service.saveEntry(dto);
    }

    // ✅ Update existing challan
    @PutMapping("/{id}")
    public KnittingOutwardChallan update(@PathVariable Long id, @RequestBody KnittingOutwardChallanDTO dto) {
        return service.updateEntry(id, dto);
    }

    // ✅ Delete challan
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.deleteEntry(id);
    }
}

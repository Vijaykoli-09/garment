package com.garment.controller;

import com.garment.DTO.KnittingMaterialReturnDTO;
import com.garment.model.KnittingMaterialReturn;
import com.garment.model.KnittingOutwardChallan;
import com.garment.model.KnittingOutwardChallanRow;
import com.garment.repository.KnittingOutwardChallanRepository;
import com.garment.service.KnittingMaterialReturnService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api/knitting-material-return")
@RequiredArgsConstructor
public class KnittingMaterialReturnController {

    private final KnittingMaterialReturnService service;
    private final KnittingOutwardChallanRepository outwardRepo;

    // CRUD for material return
    @PostMapping
    public KnittingMaterialReturn create(@RequestBody KnittingMaterialReturnDTO dto) {
        return service.save(dto);
    }

    @PutMapping("/{id}")
    public KnittingMaterialReturn update(@PathVariable Long id, @RequestBody KnittingMaterialReturnDTO dto) {
        return service.update(id, dto);
    }

    @GetMapping("/{id}")
    public KnittingMaterialReturn getById(@PathVariable Long id) {
        return service.getById(id);
    }

    @GetMapping
    public List<KnittingMaterialReturn> getAll() {
        return service.getAll();
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    // --- Auto-fetch outward challans by party (used by frontend)
    @GetMapping("/outwards/by-party/{partyId}")
    public List<KnittingOutwardChallan> getOutwardsByParty(@PathVariable Long partyId) {
        return outwardRepo.findByParty_Id(partyId);
    }

    // fetch items of one outward challan
    @GetMapping("/outwards/items/{challanId}")
    public List<KnittingOutwardChallanRow> getOutwardItems(@PathVariable Long challanId) {
        KnittingOutwardChallan c = outwardRepo.findById(challanId)
                .orElseThrow(() -> new RuntimeException("Challan not found"));
        return c.getItems();
    }
}

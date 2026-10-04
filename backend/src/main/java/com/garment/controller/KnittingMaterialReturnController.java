package com.garment.controller;

import com.garment.DTO.KnittingMaterialReturnDTO;
import com.garment.model.KnittingMaterialReturn;
import com.garment.model.KnittingOutwardChallan;
import com.garment.model.KnittingOutwardChallanRow;
import com.garment.repository.KnittingOutwardChallanRepository;
import com.garment.service.KnittingMaterialReturnService;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api/knitting-material-return")
@RequiredArgsConstructor
public class KnittingMaterialReturnController {

    private final KnittingMaterialReturnService service;

    private final KnittingOutwardChallanRepository outwardRepo;

    // =====================================================
    // CREATE
    // =====================================================

    @PostMapping
    public KnittingMaterialReturn create(
            @RequestBody KnittingMaterialReturnDTO dto) {

        return service.save(dto);
    }

    // =====================================================
    // UPDATE
    // =====================================================

    @PutMapping("/{id}")
    public KnittingMaterialReturn update(
            @PathVariable Long id,
            @RequestBody KnittingMaterialReturnDTO dto) {

        return service.update(
                id,
                dto
        );
    }

    // =====================================================
    // GET BY ID
    // =====================================================

    @GetMapping("/{id}")
    public KnittingMaterialReturn getById(
            @PathVariable Long id) {

        return service.getById(id);
    }

    // =====================================================
    // GET ALL
    // =====================================================

    @GetMapping
    public List<KnittingMaterialReturn> getAll() {

        return service.getAll();
    }

    // =====================================================
    // DELETE
    // =====================================================

    @DeleteMapping("/{id}")
    public void delete(
            @PathVariable Long id) {

        service.delete(id);
    }

    // =====================================================
    // OLD ENDPOINT
    // GET OUTWARD CHALLANS BY PARTY
    // =====================================================

    @GetMapping(
            "/outwards/by-party/{partyId}"
    )
    public List<KnittingOutwardChallan>
    getOutwardsByParty(
            @PathVariable Long partyId) {

        return outwardRepo.findByParty_Id(
                partyId
        );
    }

    // =====================================================
    // OLD ENDPOINT
    // GET ITEMS OF ONE OUTWARD CHALLAN
    // =====================================================

    @GetMapping(
            "/outwards/items/{challanId}"
    )
    public List<KnittingOutwardChallanRow>
    getOutwardItems(
            @PathVariable Long challanId) {

        KnittingOutwardChallan c =
                outwardRepo.findById(
                        challanId
                ).orElseThrow(
                        () -> new RuntimeException(
                                "Challan not found"
                        )
                );

        return c.getItems();
    }

    // =====================================================
    // NEW ENDPOINT
    //
    // GET ALL OUTWARD ITEMS OF SELECTED PARTY
    //
    // Frontend uses this endpoint after party selection.
    // No challan selection required.
    // =====================================================

    @GetMapping(
            "/outwards/items/by-party/{partyId}"
    )
    public List<KnittingOutwardChallanRow>
    getAllOutwardItemsByParty(
            @PathVariable Long partyId) {

        List<KnittingOutwardChallan>
                outwardList =
                outwardRepo.findByParty_Id(
                        partyId
                );

        List<KnittingOutwardChallanRow>
                allRows =
                new ArrayList<>();

        for (
                KnittingOutwardChallan outward
                : outwardList
        ) {

            if (
                    outward.getItems() != null
            ) {

                allRows.addAll(
                        outward.getItems()
                );
            }
        }

        return allRows;
    }
}
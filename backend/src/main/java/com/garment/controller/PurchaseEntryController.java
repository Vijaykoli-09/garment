package com.garment.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.garment.DTO.PurchaseEntryItemDTO;
import com.garment.DTO.PurchaseEntryRequestDTO;
import com.garment.model.PurchaseEntry;
import com.garment.service.PurchaseEntryService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/purchase-entry")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class PurchaseEntryController {
	private final PurchaseEntryService service;

    // ✅ Create Purchase Entry
    @PostMapping
    public ResponseEntity<PurchaseEntry> save(@RequestBody PurchaseEntryRequestDTO dto) {
        PurchaseEntry savedEntry = service.saveEntry(dto);
        return ResponseEntity.ok(savedEntry);
    }

    // ✅ Get Purchase Entry by ID
    @GetMapping("/{id}")
    public ResponseEntity<PurchaseEntry> get(@PathVariable Long id) {
        PurchaseEntry entry = service.getEntry(id);
        return ResponseEntity.ok(entry);
    }

    // ✅ Get All Purchase Entries
    @GetMapping
    public ResponseEntity<List<PurchaseEntry>> getAll() {
        List<PurchaseEntry> entries = service.getAllEntries();
        return ResponseEntity.ok(entries);
    }

    // ✅ Update Purchase Entry
    @PutMapping("/{id}")
    public ResponseEntity<PurchaseEntry> update(@PathVariable Long id, @RequestBody PurchaseEntryRequestDTO dto) {
        PurchaseEntry updatedEntry = service.updateEntry(id, dto);
        return ResponseEntity.ok(updatedEntry);
    }

    // ✅ Delete Purchase Entry
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.deleteEntry(id);
        return ResponseEntity.noContent().build();
    }

    // ✅ Fetch Purchase Entry Draft by Party (auto-fill from Purchase Order)
    @GetMapping("/draft-by-party/{partyId}")
    public ResponseEntity<List<PurchaseEntryItemDTO>> getDraftByParty(@PathVariable Long partyId) {
        List<PurchaseEntryItemDTO> items = service.getItemsByParty(partyId);
        return ResponseEntity.ok(items);
    }

    // ✅ Issue to Knitting Outward (stubbed)
    @PostMapping("/{id}/issue")
    public ResponseEntity<Void> issueToKnittingOutward(@PathVariable Long id) {
        service.issueToKnittingOutward(id);
        return ResponseEntity.ok().build();
    }
    
}



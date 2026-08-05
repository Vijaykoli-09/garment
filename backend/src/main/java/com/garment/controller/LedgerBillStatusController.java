// src/main/java/com/garment/controller/LedgerBillStatusController.java
package com.garment.controller;

import com.garment.DTO.LedgerBillStatusDTO;
import com.garment.DTO.LedgerManualPaidUpdateRequest;
import com.garment.DTO.LedgerStatusBulkGetRequest;
import com.garment.service.LedgerBillStatusService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ledger-status")
@CrossOrigin(origins = "http://localhost:3000")
public class LedgerBillStatusController {

    private final LedgerBillStatusService service;

    public LedgerBillStatusController(LedgerBillStatusService service) {
        this.service = service;
    }

    // Optional: get a single status (returns default if not exists)
    @GetMapping("/{docKey}")
    public LedgerBillStatusDTO getOne(@PathVariable String docKey) {
        return service.getByDocKey(docKey);
    }

    // Bulk get statuses for a list of docKeys (non-existing keys are simply not returned)
    @PostMapping("/bulk-get")
    public List<LedgerBillStatusDTO> bulkGet(@RequestBody LedgerStatusBulkGetRequest req) {
        return service.bulkGetByDocKeys(req.getKeys());
    }

    // Upsert manualPaidUser
    @PutMapping("/manual-paid")
    public LedgerBillStatusDTO setManualPaid(@RequestBody LedgerManualPaidUpdateRequest req) {
        return service.upsertManualPaidUser(req.getDocKey(), req.isManualPaidUser());
    }
}
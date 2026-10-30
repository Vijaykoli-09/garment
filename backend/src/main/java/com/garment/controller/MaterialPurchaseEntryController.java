package com.garment.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
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
import org.springframework.web.bind.annotation.RequestParam;

import com.garment.DTO.MaterialPurchaseEntryDTO;
import com.garment.DTO.MaterialPurchaseEntryListDTO;
import com.garment.DTO.MaterialPurchaseEntryResponseDTO;
import com.garment.DTO.PagedResponse;
import com.garment.service.MaterialPurchaseEntryService;

@RestController
@RequestMapping("/api")
@CrossOrigin(originPatterns = "*")
public class MaterialPurchaseEntryController {

    private final MaterialPurchaseEntryService service;

    public MaterialPurchaseEntryController(MaterialPurchaseEntryService service) {
        this.service = service;
    }

    // GET /purchase/entry-item
    @GetMapping("/purchase/entry-item")
    public List<MaterialPurchaseEntryResponseDTO> getAll() {
        return service.getAllEntries();
    }

    @GetMapping("/purchase/entry-item/paged")
    public PagedResponse<MaterialPurchaseEntryListDTO> getAllPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search) {
        return service.getAllEntriesPaged(page, size, search);
    }

    // GET /purchase/entry-item/{id}
    @GetMapping("/purchase/entry-item/{id}")
    public MaterialPurchaseEntryResponseDTO getById(@PathVariable Long id) {
        return service.getEntryById(id);
    }

    // POST /purchase/entry-item
    @PostMapping("/purchase/entry-item")
    public ResponseEntity<MaterialPurchaseEntryResponseDTO> create(
            @RequestBody MaterialPurchaseEntryDTO request
    ) {
        MaterialPurchaseEntryResponseDTO created = service.createEntry(request);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    // PUT /purchase/entry-item/{id}
    @PutMapping("/purchase/entry-item/{id}")
    public MaterialPurchaseEntryResponseDTO update(
            @PathVariable Long id,
            @RequestBody MaterialPurchaseEntryDTO request
    ) {
        return service.updateEntry(id, request);
    }

    // DELETE /purchase/entry-item/{id}
    @DeleteMapping("/purchase/entry-item/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.deleteEntry(id);
        return ResponseEntity.noContent().build();
    }

    // GET /purchase-entry/draft-by-party/{partyId}
    @GetMapping("/purchase-entry/draft/{partyId}")
    public List<Object> getDraftByParty(@PathVariable Long partyId) {
        return service.getDraftByParty(partyId);
    }
}
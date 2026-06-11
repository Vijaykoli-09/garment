package com.garment.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.garment.DTO.MaterialPurchaseEntryDTO;
import com.garment.DTO.MaterialPurchaseEntryItemResponseDTO;
import com.garment.DTO.MaterialPurchaseEntryResponseDTO;
import com.garment.DTO.MaterialPurchaseItemDTO;
import com.garment.DTO.MaterialResponseDTO;
import com.garment.model.Material;
import com.garment.model.MaterialPurchaseEntry;
import com.garment.model.MaterialPurchaseEntryItem;
import com.garment.model.Party;
import com.garment.repository.MaterialPurchaseRepository;
import com.garment.repository.MaterialRepository;
import com.garment.repository.PartyRepository;

@Service
public class MaterialPurchaseEntryService {

    private final MaterialPurchaseRepository entryRepository;
    private final PartyRepository partyRepository;
    private final MaterialRepository materialRepository;

    public MaterialPurchaseEntryService(
            MaterialPurchaseRepository entryRepository,
            PartyRepository partyRepository,
            MaterialRepository materialRepository
    ) {
        this.entryRepository = entryRepository;
        this.partyRepository = partyRepository;
        this.materialRepository = materialRepository;
    }

    /* ------------ CRUD ------------ */

    @Transactional(readOnly = true)
    public List<MaterialPurchaseEntryResponseDTO> getAllEntries() {
        List<MaterialPurchaseEntry> entries = entryRepository.findAll();
        return entries.stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public MaterialPurchaseEntryResponseDTO getEntryById(Long id) {
        MaterialPurchaseEntry entry = entryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Entry not found"));
        return toResponseDTO(entry);
    }

    @Transactional
    public MaterialPurchaseEntryResponseDTO createEntry(MaterialPurchaseEntryDTO request) {
        validateRequest(request);

        LocalDate date = LocalDate.parse(request.getDate());

        Party party = partyRepository.findById(request.getPartyId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid partyId"));

        MaterialPurchaseEntry entry = new MaterialPurchaseEntry();
        entry.setDate(date);
        entry.setChallanNo(request.getChallanNo());
        entry.setParty(party);

        // Items
        if (request.getItems() != null) {
            for (MaterialPurchaseItemDTO itemReq : request.getItems()) {
                MaterialPurchaseEntryItem item = buildItemFromRequest(itemReq);
                entry.addItem(item); // sets item.setPurchaseEntry(this)
            }
        }

        MaterialPurchaseEntry saved = entryRepository.save(entry);
        return toResponseDTO(saved);
    }

    @Transactional
    public MaterialPurchaseEntryResponseDTO updateEntry(Long id, MaterialPurchaseEntryDTO request) {
        validateRequest(request);

        MaterialPurchaseEntry entry = entryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Entry not found"));

        LocalDate date = LocalDate.parse(request.getDate());

        Party party = partyRepository.findById(request.getPartyId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid partyId"));

        entry.setDate(date);
        entry.setChallanNo(request.getChallanNo());
        entry.setParty(party);

        // Replace items
        entry.clearItems();
        if (request.getItems() != null) {
            for (MaterialPurchaseItemDTO itemReq : request.getItems()) {
                MaterialPurchaseEntryItem item = buildItemFromRequest(itemReq);
                entry.addItem(item);
            }
        }

        MaterialPurchaseEntry saved = entryRepository.save(entry);
        return toResponseDTO(saved);
    }

    @Transactional
    public void deleteEntry(Long id) {
        MaterialPurchaseEntry entry = entryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Entry not found"));
        entryRepository.delete(entry);
    }

    /* ------------ Draft by party (currently empty list) ------------ */

    @Transactional(readOnly = true)
    public List<Object> getDraftByParty(Long partyId) {
        // For now, just return empty list so frontend doesn't crash.
        // Later you can implement actual draft logic if you have a separate table/source.
        return new ArrayList<>();
    }

    /* ------------ Helpers ------------ */

    private void validateRequest(MaterialPurchaseEntryDTO request) {
        if (request.getDate() == null || request.getDate().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "date is required");
        }
        if (request.getPartyId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "partyId is required");
        }
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one item is required");
        }
    }

    private MaterialPurchaseEntryItem buildItemFromRequest(MaterialPurchaseItemDTO dto) {
        MaterialPurchaseEntryItem item = new MaterialPurchaseEntryItem();

        // Material
        Material material = null;
        if (dto.getMaterialId() != null) {
            material = materialRepository.findById(dto.getMaterialId())
                    .orElseThrow(() ->
                            new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid materialId: " + dto.getMaterialId()));
        }
        item.setMaterial(material);

        if (material != null) {
            item.setMaterialName(material.getMaterialName());
            item.setUnit(material.getMaterialUnit());
        } else {
            item.setMaterialName(dto.getMaterialName());
            item.setUnit(null);
        }

        item.setOrderNo(dto.getOrderNo());
        item.setShadeCode(dto.getShadeCode());
        item.setShadeName(dto.getShadeName());

        BigDecimal roll = BigDecimal.valueOf(dto.getRoll() != null ? dto.getRoll() : 0d);
        BigDecimal wtPerBox = BigDecimal.valueOf(dto.getWtPerBox() != null ? dto.getWtPerBox() : 0d);
        BigDecimal rate = BigDecimal.valueOf(dto.getRate() != null ? dto.getRate() : 0d);

        BigDecimal amount;
        if (dto.getAmount() != null) {
            amount = BigDecimal.valueOf(dto.getAmount());
        } else {
            amount = wtPerBox.multiply(rate);
        }

        item.setRoll(roll);
        item.setWtPerBox(wtPerBox);
        item.setRate(rate);
        item.setAmount(amount);

        return item;
    }

    private MaterialPurchaseEntryResponseDTO toResponseDTO(MaterialPurchaseEntry entry) {
        MaterialPurchaseEntryResponseDTO dto = new MaterialPurchaseEntryResponseDTO();

        dto.setId(entry.getId());
        dto.setDate(entry.getDate().toString()); // yyyy-MM-dd
        dto.setChallanNo(entry.getChallanNo());

        // Party
        Party partyDto = new Party();
        partyDto.setId(entry.getParty().getId());
        partyDto.setPartyName(entry.getParty().getPartyName());
        dto.setParty(partyDto);

        // Items
        List<MaterialPurchaseEntryItemResponseDTO> itemDtos = entry.getItems().stream()
                .map(this::toItemResponseDTO)
                .collect(Collectors.toList());
        dto.setItems(itemDtos);

        return dto;
    }

    private MaterialPurchaseEntryItemResponseDTO toItemResponseDTO(MaterialPurchaseEntryItem item) {
        MaterialPurchaseEntryItemResponseDTO dto = new MaterialPurchaseEntryItemResponseDTO();

        dto.setId(item.getId());
        dto.setOrderNo(item.getOrderNo());
        dto.setShadeCode(item.getShadeCode());
        dto.setShadeName(item.getShadeName());

        dto.setRoll(item.getRoll() != null ? item.getRoll().doubleValue() : 0d);
        dto.setWtPerBox(item.getWtPerBox() != null ? item.getWtPerBox().doubleValue() : 0d);
        dto.setRate(item.getRate() != null ? item.getRate().doubleValue() : 0d);
        dto.setAmount(item.getAmount() != null ? item.getAmount().doubleValue() : 0d);

        dto.setMaterialName(item.getMaterialName());
        dto.setUnit(item.getUnit());

        // Nested material DTO for React: i.material?.materialName OR i.materialName
        if (item.getMaterial() != null) {
            Material m = item.getMaterial();
            MaterialResponseDTO mDto = new MaterialResponseDTO();
            mDto.setId(m.getId());
            mDto.setMaterialName(m.getMaterialName());
            mDto.setMaterialUnit(m.getMaterialUnit());
            // If your MaterialResponseDTO has materialGroup, set it here as well.
            dto.setMaterial(mDto);
        }

        return dto;
    }
}
package com.garment.serviceImpl;

import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

import com.garment.DTO.PurchaseEntryItemDTO;
import com.garment.DTO.PurchaseEntryRequestDTO;
import com.garment.model.Material;
import com.garment.model.MaterialGroup;
import com.garment.model.Party;
import com.garment.model.PurchaseEntry;
import com.garment.model.PurchaseEntryItem;
import com.garment.model.PurchaseOrderItem;
import com.garment.model.Shade;
import com.garment.repository.MaterialRepository;
import com.garment.repository.PartyRepository;
import com.garment.repository.PurchaseEntryItemRepository;
import com.garment.repository.PurchaseEntryRepository;
import com.garment.repository.PurchaseOrderItemRepository;
import com.garment.repository.ShadeRepository;
import com.garment.service.MaterialStockService;
import com.garment.service.PurchaseEntryService;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PurchaseEntryServiceImpl implements PurchaseEntryService {

    private final PurchaseEntryRepository entryRepo;
    private final PurchaseEntryItemRepository itemRepo;
    private final PurchaseOrderItemRepository orderItemRepo;
    private final PartyRepository partyRepo;
    private final MaterialRepository materialRepo;
    private final ShadeRepository shadeRepo;
    private final MaterialStockService stockService;


    // ✅ SAVE ENTRY
    @Override
    public PurchaseEntry saveEntry(PurchaseEntryRequestDTO dto) {

        Party party = partyRepo.findById(dto.getPartyId())
                .orElseThrow(() -> new RuntimeException("Party not found"));

        PurchaseEntry entry = new PurchaseEntry();
        entry.setDate(dto.getDate());
        entry.setParty(party);
        entry.setChallanNo(dto.getChallanNo());

        List<PurchaseEntryItem> items = dto.getItems().stream().map(itemDto -> {

            // --- Make material optional, but require Yarn OR Material ---
            boolean hasYarn = itemDto.getYarnName() != null && !itemDto.getYarnName().isBlank();
            boolean hasMaterial = itemDto.getMaterialId() != null && itemDto.getMaterialId() > 0;

            if (!hasYarn && !hasMaterial) {
                throw new RuntimeException("Either Yarn Name or Material must be selected for each row.");
            }

            Material material = null;
            MaterialGroup group = null;
            String unit = null;

            if (hasMaterial) {
                material = materialRepo.findById(itemDto.getMaterialId())
                        .orElseThrow(() -> new RuntimeException("Material not found: " + itemDto.getMaterialId()));
                group = material.getMaterialGroup();
                unit = material.getMaterialUnit();
            }

            Shade shade = null;
            if (itemDto.getShadeCode() != null && !itemDto.getShadeCode().isBlank()) {
                shade = shadeRepo.findById(itemDto.getShadeCode())
                        .orElseThrow(() -> new RuntimeException("Shade not found: " + itemDto.getShadeCode()));
            }

            PurchaseEntryItem item = new PurchaseEntryItem();
            item.setPurchaseEntry(entry);
            item.setMaterialGroup(group);        // can be null
            item.setMaterial(material);          // can be null
            item.setShade(shade);
            item.setRoll(itemDto.getRoll());
            item.setWtPerBox(itemDto.getWtPerBox());
            item.setRate(itemDto.getRate());
            item.setAmount(itemDto.getAmount());
            item.setOrderNo(itemDto.getOrderNo());
            item.setUnit(unit);                  // can be null
            item.setYarnName(itemDto.getYarnName());
            return item;
        }).collect(Collectors.toList());

        entry.setItems(items);
        PurchaseEntry savedEntry = entryRepo.save(entry);

        // ✅ Increase stock only for rows that have a material
        savedEntry.getItems().stream()
                .filter(i -> i.getMaterial() != null)
                .forEach(stockService::creditStock);

        return savedEntry;
    }


    // ✅ GET PURCHASE ORDER ITEMS BY PARTY
    @Override
    public List<PurchaseEntryItemDTO> getItemsByParty(Long partyId) {
        List<PurchaseOrderItem> orderItems = orderItemRepo.findItemsByPartyId(partyId);

        return orderItems.stream().map(item -> {
            PurchaseEntryItemDTO dto = new PurchaseEntryItemDTO();

            if (item.getItem() != null) {
                dto.setMaterialId(item.getItem().getId());
                dto.setMaterialGroupId(item.getItem().getMaterialGroup().getId());
                dto.setMaterialName(item.getItem().getMaterialName());
                dto.setUnit(item.getItem().getMaterialUnit());
            }

            if (item.getShade() != null) {
                dto.setShadeCode(item.getShade().getShadeCode());
                dto.setShadeName(item.getShade().getShadeName());
            }

            dto.setRoll(item.getRoll());
            dto.setWtPerBox(item.getQuantity());
            dto.setRate(item.getRate());
            dto.setAmount(item.getAmount());
            dto.setYarnName(item.getYarnName());
            dto.setOrderNo(item.getPurchaseOrder() != null ? item.getPurchaseOrder().getOrderNo() : "");

            return dto;
        }).collect(Collectors.toList());
    }


    @Override
    public PurchaseEntry getEntry(Long id) {
        return entryRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Entry not found"));
    }

    @Override
    public List<PurchaseEntry> getAllEntries() {
        return entryRepo.findAll();
    }


    // ✅ UPDATE ENTRY WITH STOCK REVERSAL (material optional)
    @Override
    @Transactional
    public PurchaseEntry updateEntry(Long id, PurchaseEntryRequestDTO dto) {

        PurchaseEntry existing = entryRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Entry not found"));

        Party party = partyRepo.findById(dto.getPartyId())
                .orElseThrow(() -> new RuntimeException("Party not found"));

        existing.setDate(dto.getDate());
        existing.setParty(party);
        existing.setChallanNo(dto.getChallanNo());

        // (If you have stock reversal for old items, keep that above this comment)

        // ✅ Then clear items
        existing.getItems().clear();

        for (PurchaseEntryItemDTO itemDto : dto.getItems()) {

            boolean hasYarn = itemDto.getYarnName() != null && !itemDto.getYarnName().isBlank();
            boolean hasMaterial = itemDto.getMaterialId() != null && itemDto.getMaterialId() > 0;

            if (!hasYarn && !hasMaterial) {
                throw new RuntimeException("Either Yarn Name or Material must be selected for each row.");
            }

            Material material = null;
            MaterialGroup group = null;
            String unit = null;

            if (hasMaterial) {
                material = materialRepo.findById(itemDto.getMaterialId())
                        .orElseThrow(() -> new RuntimeException("Material not found: " + itemDto.getMaterialId()));
                group = material.getMaterialGroup();
                unit = material.getMaterialUnit();
            }

            Shade shade = null;
            if (itemDto.getShadeCode() != null && !itemDto.getShadeCode().isBlank()) {
                shade = shadeRepo.findById(itemDto.getShadeCode())
                        .orElseThrow(() -> new RuntimeException("Shade not found: " + itemDto.getShadeCode()));
            }

            PurchaseEntryItem item = new PurchaseEntryItem();
            item.setPurchaseEntry(existing);
            item.setMaterialGroup(group);
            item.setMaterial(material);
            item.setShade(shade);
            item.setRoll(itemDto.getRoll());
            item.setWtPerBox(itemDto.getWtPerBox());
            item.setRate(itemDto.getRate());
            item.setAmount(itemDto.getAmount());
            item.setOrderNo(itemDto.getOrderNo());
            item.setUnit(unit);
            item.setYarnName(itemDto.getYarnName());

            existing.getItems().add(item);
        }

        PurchaseEntry updated = entryRepo.save(existing);

        // ✅ Add new stock only where material is present
        updated.getItems().stream()
                .filter(i -> i.getMaterial() != null)
                .forEach(stockService::creditStock);

        return updated;
    }


    @Override
    public void deleteEntry(Long id) {
        PurchaseEntry entry = entryRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Entry not found"));
        itemRepo.deleteAll(entry.getItems());
        entryRepo.delete(entry);
    }

    @Override
    public void issueToKnittingOutward(Long entryId) {
        PurchaseEntry entry = entryRepo.findById(entryId)
                .orElseThrow(() -> new RuntimeException("Entry not found"));
        // future logic
    }
}

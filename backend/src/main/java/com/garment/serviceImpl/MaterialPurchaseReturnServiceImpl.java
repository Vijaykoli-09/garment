package com.garment.serviceImpl;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.garment.DTO.MaterialPurchaseReturnItemDTO;
import com.garment.DTO.MaterialPurchaseReturnRequestDTO;
import com.garment.DTO.MaterialPurchaseReturnResponseDTO;
import com.garment.model.Material;
import com.garment.model.MaterialPurchaseReturn;
import com.garment.model.MaterialPurchaseReturnItem;
import com.garment.model.Party;
import com.garment.model.PurchaseOrderItem;
import com.garment.model.Shade;
import com.garment.repository.MaterialPurchaseReturnRepository;
import com.garment.repository.MaterialRepository;
import com.garment.repository.PartyRepository;
import com.garment.repository.PurchaseOrderItemRepository;
import com.garment.repository.ShadeRepository;
import com.garment.service.MaterialPurchaseReturnService;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class MaterialPurchaseReturnServiceImpl implements MaterialPurchaseReturnService {

    private final MaterialPurchaseReturnRepository returnRepo;
    private final PartyRepository partyRepo;
    private final MaterialRepository materialRepo;
    private final ShadeRepository shadeRepo;
    private final PurchaseOrderItemRepository purchaseOrderItemRepository;

    @Override
    public MaterialPurchaseReturn create(MaterialPurchaseReturnRequestDTO dto) {
        Party party = partyRepo.findById(dto.getPartyId())
                .orElseThrow(() -> new RuntimeException("Party not found"));

        MaterialPurchaseReturn pr = new MaterialPurchaseReturn();
        pr.setDate(dto.getDate());
        pr.setChallanNo(dto.getChallanNo());
        pr.setParty(party);

        if (dto.getItems() != null) {
            for (MaterialPurchaseReturnItemDTO itemDto : dto.getItems()) {
                pr.getItems().add(toEntityItem(pr, itemDto));
            }
        }

        return returnRepo.save(pr);
    }

    @Override
    public MaterialPurchaseReturn get(Long id) {
        return returnRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Material Purchase Return not found"));
    }

    @Override
    public List<MaterialPurchaseReturnResponseDTO> getAll() {
        return returnRepo.findAllWithItems()
                .stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public MaterialPurchaseReturn update(Long id, MaterialPurchaseReturnRequestDTO dto) {
        MaterialPurchaseReturn existing = returnRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Material Purchase Return not found"));

        Party party = partyRepo.findById(dto.getPartyId())
                .orElseThrow(() -> new RuntimeException("Party not found"));

        existing.setDate(dto.getDate());
        existing.setChallanNo(dto.getChallanNo());
        existing.setParty(party);

        // Frontend doesn't send itemId, easiest stable update is clear + re-add
        existing.getItems().clear();

        if (dto.getItems() != null) {
            for (MaterialPurchaseReturnItemDTO itemDto : dto.getItems()) {
                existing.getItems().add(toEntityItem(existing, itemDto));
            }
        }

        return returnRepo.save(existing);
    }

    @Override
    public void delete(Long id) {
        MaterialPurchaseReturn existing = returnRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Material Purchase Return not found"));
        returnRepo.delete(existing); // orphanRemoval=true deletes child items
    }

    @Override
    public MaterialPurchaseReturnResponseDTO toResponseDTO(MaterialPurchaseReturn pr) {
        MaterialPurchaseReturnResponseDTO dto = new MaterialPurchaseReturnResponseDTO();

        dto.setId(pr.getId());
        dto.setDate(pr.getDate());
        dto.setChallanNo(pr.getChallanNo());

        dto.setPartyId(pr.getParty() != null ? pr.getParty().getId() : null);
        dto.setPartyName(pr.getParty() != null ? pr.getParty().getPartyName() : null);

        List<MaterialPurchaseReturnItemDTO> items = pr.getItems().stream().map(item -> {
            MaterialPurchaseReturnItemDTO i = new MaterialPurchaseReturnItemDTO();

            i.setOrderNo(item.getOrderNo());
            i.setReturnRolls(item.getReturnRolls());
            i.setQuantity(item.getQuantity() != null ? item.getQuantity().doubleValue() : 0.0);
            i.setReturnWeight(item.getReturnWeight());

            i.setUnit(item.getUnit());
            i.setRate(item.getRate());
            i.setAmount(item.getAmount());

            if (item.getMaterial() != null) {
                i.setMaterialId(item.getMaterial().getId());
                i.setMaterialName(item.getMaterial().getMaterialName());
                i.setItemName(item.getMaterial().getMaterialName());
            }

            if (item.getShade() != null) {
                i.setShadeCode(item.getShade().getShadeCode());
                i.setShadeName(item.getShade().getShadeName());
            } else {
                i.setShadeCode(null);
                i.setShadeName("");
            }

            return i;
        }).collect(Collectors.toList());

        dto.setItems(items);
        return dto;
    }

    @Override
    public List<MaterialPurchaseReturnItemDTO> getTemplateByParty(Long partyId) {
        List<PurchaseOrderItem> items = purchaseOrderItemRepository.findItemsByPartyId(partyId);

        return items.stream().map(poi -> {
            MaterialPurchaseReturnItemDTO dto = new MaterialPurchaseReturnItemDTO();

            // Material
            if (poi.getItem() != null) {
                dto.setMaterialId(poi.getItem().getId());
                dto.setMaterialName(poi.getItem().getMaterialName());
                dto.setItemName(poi.getItem().getMaterialName());
                dto.setUnit(poi.getItem().getMaterialUnit());
            } else {
                dto.setMaterialId(null);
                dto.setMaterialName("");
                dto.setItemName("");
                dto.setUnit(poi.getUnit());
            }

            // Shade
            if (poi.getShade() != null) {
                dto.setShadeCode(poi.getShade().getShadeCode());
                dto.setShadeName(poi.getShade().getShadeName());
            }

            dto.setReturnRolls(poi.getRoll());
            dto.setQuantity(poi.getQuantity() != null ? poi.getQuantity().doubleValue() : 0.0);
            dto.setRate(poi.getRate());
            dto.setAmount(poi.getAmount());

            dto.setReturnWeight(0.0); // not present in PO item normally

            dto.setOrderNo(poi.getPurchaseOrder() != null ? poi.getPurchaseOrder().getOrderNo() : "");
            return dto;
        }).collect(Collectors.toList());
    }

    private MaterialPurchaseReturnItem toEntityItem(MaterialPurchaseReturn pr, MaterialPurchaseReturnItemDTO itemDto) {

        Material m = materialRepo.findById(itemDto.getMaterialId())
                .orElseThrow(() -> new RuntimeException("Material not found"));

        Shade s = null;
        if (itemDto.getShadeCode() != null && !itemDto.getShadeCode().isBlank()) {
            // Assumes Shade @Id is shadeCode (String). If Shade @Id is Long, change this.
            s = shadeRepo.findById(itemDto.getShadeCode()).orElse(null);
        }

        MaterialPurchaseReturnItem item = new MaterialPurchaseReturnItem();
        item.setMaterialPurchaseReturn(pr);
        item.setMaterial(m);
        item.setShade(s);

        item.setOrderNo(itemDto.getOrderNo());
        item.setReturnRolls(itemDto.getReturnRolls());

        // entity quantity is Integer, frontend sends number => safely convert
        item.setQuantity(itemDto.getQuantity() != null ? itemDto.getQuantity().intValue() : 0);

        item.setReturnWeight(itemDto.getReturnWeight() != null ? itemDto.getReturnWeight() : 0.0);

        item.setUnit(itemDto.getUnit() != null ? itemDto.getUnit() : m.getMaterialUnit());
        item.setRate(itemDto.getRate() != null ? itemDto.getRate() : 0.0);
        item.setAmount(itemDto.getAmount() != null ? itemDto.getAmount() : 0.0);

        return item;
    }
}
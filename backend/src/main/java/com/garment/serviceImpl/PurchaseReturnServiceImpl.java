package com.garment.serviceImpl;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.garment.DTO.PurchaseReturnItemDTO;
import com.garment.DTO.PurchaseReturnRequestDTO;
import com.garment.DTO.PurchaseReturnResponseDTO;
import com.garment.model.Material;
import com.garment.model.Party;
import com.garment.model.PurchaseOrderItem;
import com.garment.model.PurchaseReturn;
import com.garment.model.PurchaseReturnItem;
import com.garment.model.Shade;
import com.garment.repository.MaterialRepository;
import com.garment.repository.PartyRepository;
import com.garment.repository.PurchaseOrderItemRepository;
import com.garment.repository.PurchaseReturnItemRepository;
import com.garment.repository.PurchaseReturnRepository;
import com.garment.repository.ShadeRepository;
import com.garment.service.PurchaseReturnService;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class PurchaseReturnServiceImpl implements PurchaseReturnService {

    private final PurchaseReturnRepository returnRepo;
    private final PurchaseReturnItemRepository returnItemRepo;
    private final PartyRepository partyRepo;
    private final MaterialRepository materialRepo;
    private final ShadeRepository shadeRepo;
    private final PurchaseOrderItemRepository purchaseOrderItemRepository;

    // ✅ Create Purchase Return
    @Override
    public PurchaseReturn createReturn(PurchaseReturnRequestDTO dto) {
        Party party = partyRepo.findById(dto.getPartyId())
                .orElseThrow(() -> new RuntimeException("Party not found"));

        PurchaseReturn pr = new PurchaseReturn();
        pr.setDate(dto.getDate());
        pr.setChallanNo(dto.getChallanNo());
        pr.setParty(party);

        List<PurchaseReturnItem> items = dto.getItems() == null ? List.of() :
                dto.getItems().stream().map(itemDto -> {
                    Material m = materialRepo.findById(itemDto.getMaterialId())
                            .orElseThrow(() -> new RuntimeException("Material not found"));
                    Shade s = itemDto.getShadeCode() == null ? null : shadeRepo.findById(itemDto.getShadeCode())
                            .orElse(null);

                    PurchaseReturnItem item = new PurchaseReturnItem();
                    item.setPurchaseReturn(pr);
                    item.setMaterial(m);
                    item.setShade(s);
                    item.setReturnRolls(itemDto.getReturnRolls());
                    item.setQuantity(itemDto.getQuantity());
                    item.setUnit(itemDto.getUnit() != null ? itemDto.getUnit() : m.getMaterialUnit());
                    item.setRate(itemDto.getRate());
                    item.setAmount(itemDto.getAmount());
                    item.setOrderNo(itemDto.getOrderNo());
                    return item;
                }).collect(Collectors.toList());

        pr.setItems(items);
        return returnRepo.save(pr);
    }

    // ✅ Get single return
    @Override
    public PurchaseReturn getReturn(Long id) {
        return returnRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("PurchaseReturn not found"));
    }

    // ✅ Get all returns with items (fetch join)
    @Override
    public List<PurchaseReturnResponseDTO> getAllReturns() {
        List<PurchaseReturn> returns = returnRepo.findAllWithItems(); // ✅ fetch join version
        return returns.stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
    }

    // ✅ Update existing return
    @Override
    public PurchaseReturn updateReturn(Long id, PurchaseReturnRequestDTO dto) {
        PurchaseReturn existing = returnRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("PurchaseReturn not found"));

        Party party = partyRepo.findById(dto.getPartyId())
                .orElseThrow(() -> new RuntimeException("Party not found"));

        existing.setDate(dto.getDate());
        existing.setChallanNo(dto.getChallanNo());
        existing.setParty(party);

        List<PurchaseReturnItem> existingItems = existing.getItems();

        // 1️⃣ Remove items that are no longer in the DTO
        existingItems.removeIf(ei -> dto.getItems().stream()
                .noneMatch(d -> d.getMaterialId().equals(ei.getMaterial().getId()) &&
                        (d.getShadeCode() == null ? ei.getShade() == null
                                                  : ei.getShade() != null && d.getShadeCode().equals(ei.getShade().getShadeCode()))));

        // 2️⃣ Update existing items or add new ones
        for (var itemDto : dto.getItems()) {
            // Try to find a matching existing item
            PurchaseReturnItem match = existingItems.stream()
                    .filter(ei -> ei.getMaterial().getId().equals(itemDto.getMaterialId()) &&
                            (ei.getShade() == null ? itemDto.getShadeCode() == null
                                                   : ei.getShade() != null && ei.getShade().getShadeCode().equals(itemDto.getShadeCode())))
                    .findFirst()
                    .orElse(null);

            if (match != null) {
                // Update existing
                match.setReturnRolls(itemDto.getReturnRolls());
                match.setQuantity(itemDto.getQuantity());
                match.setRate(itemDto.getRate());
                match.setAmount(itemDto.getAmount());
                match.setUnit(itemDto.getUnit() != null ? itemDto.getUnit() : match.getMaterial().getMaterialUnit());
                match.setOrderNo(itemDto.getOrderNo());
            } else {
                // Add new item
                Material m = materialRepo.findById(itemDto.getMaterialId())
                        .orElseThrow(() -> new RuntimeException("Material not found"));
                Shade s = itemDto.getShadeCode() == null ? null : shadeRepo.findById(itemDto.getShadeCode()).orElse(null);

                PurchaseReturnItem newItem = new PurchaseReturnItem();
                newItem.setPurchaseReturn(existing);
                newItem.setMaterial(m);
                newItem.setShade(s);
                newItem.setReturnRolls(itemDto.getReturnRolls());
                newItem.setQuantity(itemDto.getQuantity());
                newItem.setRate(itemDto.getRate());
                newItem.setAmount(itemDto.getAmount());
                newItem.setUnit(itemDto.getUnit() != null ? itemDto.getUnit() : m.getMaterialUnit());
                newItem.setOrderNo(itemDto.getOrderNo());

                existingItems.add(newItem);
            }
        }

        return returnRepo.save(existing);
    }



    // ✅ Delete return
    @Override
    public void deleteReturn(Long id) {
        PurchaseReturn existing = returnRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("PurchaseReturn not found"));
        returnItemRepo.deleteAll(existing.getItems());
        returnRepo.delete(existing);
    }

    @Override
    public PurchaseReturnResponseDTO toResponseDTO(PurchaseReturn pr) {
        PurchaseReturnResponseDTO dto = new PurchaseReturnResponseDTO();
        dto.setId(pr.getId());
        dto.setDate(pr.getDate());
        dto.setChallanNo(pr.getChallanNo());
        dto.setPartyId(pr.getParty() != null ? pr.getParty().getId() : null);
        dto.setPartyName(pr.getParty() != null ? pr.getParty().getPartyName() : null);

        List<PurchaseReturnItemDTO> items = pr.getItems().stream().map(item -> {
            PurchaseReturnItemDTO idto = new PurchaseReturnItemDTO();

            // ✅ Material details
            if (item.getMaterial() != null) {
                idto.setMaterialId(item.getMaterial().getId());
                idto.setMaterialName(item.getMaterial().getMaterialName());
                idto.setItemName(item.getMaterial().getMaterialName());
            }

            // ✅ Shade details
            idto.setShadeName(item.getShade() != null ? item.getShade().getShadeName() : "");

            // ✅ Other details
            idto.setReturnRolls(item.getReturnRolls());
            idto.setQuantity(item.getQuantity());
            idto.setUnit(item.getUnit());
            idto.setRate(item.getRate());
            idto.setAmount(item.getAmount());
            idto.setOrderNo(item.getOrderNo());

            return idto;
        }).collect(Collectors.toList());

        dto.setItems(items);
        return dto;
    }


    // ✅ Template fetch (used when selecting Party in frontend)
    @Override
    public List<PurchaseReturnItemDTO> getTemplateByParty(Long partyId) {
        List<PurchaseOrderItem> items = purchaseOrderItemRepository.findItemsByPartyId(partyId);

        return items.stream().map(poi -> {
            PurchaseReturnItemDTO dto = new PurchaseReturnItemDTO();
            dto.setMaterialId(poi.getItem() != null ? poi.getItem().getId() : null);
            dto.setMaterialName(poi.getItem() != null ? poi.getItem().getMaterialName() : null);
            dto.setItemName(poi.getItem() != null ? poi.getItem().getMaterialName() : null); // ✅ ensure consistency
            dto.setUnit(poi.getItem() != null ? poi.getItem().getMaterialUnit() : poi.getUnit());
            dto.setShadeCode(poi.getShade() != null ? poi.getShade().getShadeCode() : null);
            dto.setShadeName(poi.getShade() != null ? poi.getShade().getShadeName() : null);
            dto.setReturnRolls(poi.getRoll());
            dto.setQuantity(poi.getQuantity());
            dto.setRate(poi.getRate());
            dto.setAmount(poi.getAmount());
            dto.setOrderNo(poi.getPurchaseOrder() != null ? poi.getPurchaseOrder().getOrderNo() : "");
            return dto;
        }).collect(Collectors.toList());
    }
}

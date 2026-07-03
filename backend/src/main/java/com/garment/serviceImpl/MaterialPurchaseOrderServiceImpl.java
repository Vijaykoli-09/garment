package com.garment.serviceImpl;


import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.garment.DTO.MaterialPurchaseOrderItemRequestDto;
import com.garment.DTO.MaterialPurchaseOrderItemResponseDTO;
import com.garment.DTO.MaterialPurchaseOrderRequestDto;
import com.garment.DTO.MaterialPurchaseOrderResponseDto;
import com.garment.model.Material;
import com.garment.model.MaterialGroup;
import com.garment.model.MaterialPurchaseOrder;
import com.garment.model.MaterialPurchaseOrderItem;
import com.garment.model.Party;
import com.garment.repository.MaterialGroupRepository;
import com.garment.repository.MaterialPurchaseOrderRepository;
import com.garment.repository.MaterialRepository;
import com.garment.repository.PartyRepository;
import com.garment.service.MaterialPurchaseOrderService;

import jakarta.persistence.EntityNotFoundException;

@Service
@Transactional
public class MaterialPurchaseOrderServiceImpl implements MaterialPurchaseOrderService {

    private final MaterialPurchaseOrderRepository orderRepo;
    private final PartyRepository partyRepo;
    private final MaterialRepository materialRepo;
    private final MaterialGroupRepository groupRepo;

    public MaterialPurchaseOrderServiceImpl(
            MaterialPurchaseOrderRepository orderRepo,
            PartyRepository partyRepo,
            MaterialRepository materialRepo,
            MaterialGroupRepository groupRepo
    ) {
        this.orderRepo = orderRepo;
        this.partyRepo = partyRepo;
        this.materialRepo = materialRepo;
        this.groupRepo = groupRepo;
    }

    @Override
    @Transactional(readOnly = true)
    public String getNextOrderNo() {
        int year = LocalDate.now().getYear();
        Integer maxSeq = orderRepo.findMaxSeqForYear(year);
        int nextSeq = (maxSeq == null) ? 1001 : (maxSeq + 1);
        return year + "/" + nextSeq;
    }

    @Override
    public MaterialPurchaseOrderResponseDto create(MaterialPurchaseOrderRequestDto dto) {
        MaterialPurchaseOrder order = new MaterialPurchaseOrder();

        int year = LocalDate.now().getYear();
        Integer maxSeq = orderRepo.findMaxSeqForYear(year);
        int nextSeq = (maxSeq == null) ? 1001 : (maxSeq + 1);

        order.setOrderYear(year);
        order.setOrderSeq(nextSeq);
        order.setOrderNo(year + "/" + nextSeq);

        order.setDate(dto.date);

        Party party = null;
        if (dto.partyId != null) {
            party = partyRepo.findById(dto.partyId.longValue())
                    .orElseThrow(() -> new EntityNotFoundException("Party not found: " + dto.partyId));
        }
        order.setParty(party);

        if (dto.items != null) {
            for (MaterialPurchaseOrderItemRequestDto itemDto : dto.items) {
                order.addItem(toEntityItem(itemDto));
            }
        }

        MaterialPurchaseOrder saved = orderRepo.save(order);
        return toResponseDto(saved);
    }

    @Override
    public MaterialPurchaseOrderResponseDto update(Long id, MaterialPurchaseOrderRequestDto dto) {
        MaterialPurchaseOrder order = orderRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Purchase order not found: " + id));

        // Keep existing orderNo/orderYear/orderSeq on update
        order.setDate(dto.date);

        Party party = null;
        if (dto.partyId != null) {
            party = partyRepo.findById(dto.partyId.longValue())
                    .orElseThrow(() -> new EntityNotFoundException("Party not found: " + dto.partyId));
        }
        order.setParty(party);

        // Replace items completely
        order.clearItems();
        if (dto.items != null) {
            for (MaterialPurchaseOrderItemRequestDto itemDto : dto.items) {
                order.addItem(toEntityItem(itemDto));
            }
        }

        MaterialPurchaseOrder saved = orderRepo.save(order);
        return toResponseDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MaterialPurchaseOrderResponseDto> getAll() {
        List<MaterialPurchaseOrder> list = orderRepo.findAll();
        List<MaterialPurchaseOrderResponseDto> out = new ArrayList<>();
        for (MaterialPurchaseOrder o : list) {
            out.add(toResponseDto(o));
        }
        return out;
    }

    @Override
    public void delete(Long id) {
        if (!orderRepo.existsById(id)) {
            throw new EntityNotFoundException("Purchase order not found: " + id);
        }
        orderRepo.deleteById(id);
    }

    // ----------------- mapping helpers -----------------

    private MaterialPurchaseOrderItem toEntityItem(MaterialPurchaseOrderItemRequestDto dto) {
        MaterialPurchaseOrderItem item = new MaterialPurchaseOrderItem();

        MaterialGroup group = null;
        if (dto.materialGroupId != null) {
            group = groupRepo.findById(dto.materialGroupId.longValue())
                    .orElseThrow(() -> new EntityNotFoundException("MaterialGroup not found: " + dto.materialGroupId));
        }
        item.setMaterialGroup(group);

        Material material = null;
        if (dto.materialId != null) {
            material = materialRepo.findById(dto.materialId.longValue())
                    .orElseThrow(() -> new EntityNotFoundException("Material not found: " + dto.materialId));
        }
        item.setMaterial(material);

        item.setShadeCode(dto.shadeCode);
        item.setRoll(dto.roll);
        item.setQuantity(dto.quantity);
        item.setUnit(dto.unit);
        item.setRate(dto.rate);
        item.setAmount(dto.amount);

        return item;
    }

    private MaterialPurchaseOrderResponseDto toResponseDto(MaterialPurchaseOrder order) {
        MaterialPurchaseOrderResponseDto dto = new MaterialPurchaseOrderResponseDto();
        dto.id = order.getId();
        dto.orderNo = order.getOrderNo();
        dto.date = order.getDate();

        if (order.getParty() != null) {
            dto.partyId = order.getParty().getId().intValue();
            dto.partyName = order.getParty().getPartyName();
        } else {
            dto.partyId = null;
            dto.partyName = null;
        }

        dto.items = new ArrayList<>();
        if (order.getItems() != null) {
            for (MaterialPurchaseOrderItem item : order.getItems()) {
                MaterialPurchaseOrderItemResponseDTO i = new MaterialPurchaseOrderItemResponseDTO();
                i.id = item.getId();

                if (item.getMaterialGroup() != null) {
                    i.materialGroupId = item.getMaterialGroup().getId().intValue();
                    i.materialGroupName = item.getMaterialGroup().getMaterialGroup();
                }

                if (item.getMaterial() != null) {
                    i.materialId = item.getMaterial().getId().intValue();
                    i.materialName = item.getMaterial().getMaterialName();
                }

                i.shadeCode = item.getShadeCode();
                i.roll = item.getRoll();
                i.quantity = item.getQuantity();
                i.unit = item.getUnit();
                i.rate = item.getRate();
                i.amount = item.getAmount();

                dto.items.add(i);
            }
        }
        return dto;
    }

    public MaterialPurchaseOrderResponseDto create1(MaterialPurchaseOrderRequestDto dto) {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'create'");
    }

    public MaterialPurchaseOrderResponseDto update1(Long id, MaterialPurchaseOrderRequestDto dto) {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'update'");
    }
}
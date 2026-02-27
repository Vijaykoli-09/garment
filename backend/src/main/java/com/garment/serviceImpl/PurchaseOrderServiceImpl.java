package com.garment.serviceImpl;

import java.util.List;

import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.garment.DTO.PurchaseOrderItemDTO;
import com.garment.DTO.PurchaseOrderRequestDTO;
import com.garment.DTO.PurchaseOrderResponseDTO;
//import com.garment.DTO.PurchasePendingOrdersDTO;
import com.garment.model.Material;
import com.garment.model.MaterialGroup;
import com.garment.model.Party;
import com.garment.model.PurchaseOrder;
import com.garment.model.PurchaseOrderItem;
import com.garment.model.Shade;
import com.garment.repository.MaterialGroupRepository;
import com.garment.repository.MaterialRepository;
import com.garment.repository.PartyRepository;
import com.garment.repository.PurchaseOrderItemRepository;
import com.garment.repository.PurchaseOrderRepository;
import com.garment.repository.ShadeRepository;
import com.garment.service.MaterialStockService;
import com.garment.service.PurchaseOrderService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PurchaseOrderServiceImpl implements PurchaseOrderService {

    private final PurchaseOrderRepository orderRepo;
    private final PurchaseOrderItemRepository itemRepo;
    private final PartyRepository partyRepo;
    private final MaterialRepository materialRepo;
    private final ShadeRepository shadeRepo;
    private final MaterialStockService stockService;
    private final MaterialGroupRepository materialGroupRepo;


    @Override
    public PurchaseOrder createOrder(PurchaseOrderRequestDTO dto) {

        Party party = partyRepo.findById(dto.getPartyId())
                .orElseThrow(() -> new RuntimeException("Party not found"));

        PurchaseOrder order = new PurchaseOrder();
        order.setOrderNo(dto.getOrderNo());
        order.setDate(dto.getDate());
        order.setParty(party);

        List<PurchaseOrderItem> items = dto.getItems().stream().map(itemDto -> {

            PurchaseOrderItem item = new PurchaseOrderItem();
            item.setPurchaseOrder(order);
            item.setRoll(itemDto.getRoll());
            item.setQuantity(itemDto.getQuantity());
            item.setRate(itemDto.getRate());
            item.setAmount(itemDto.getAmount());
            item.setYarnName(itemDto.getYarnName());  // <-- Yarn-only allowed

            // ---------------------------------------------------------
            // CASE 1: Yarn Name ONLY (Material fields missing)
            // ---------------------------------------------------------
            if (itemDto.getMaterialId() == null) {
                item.setMaterialGroup(null);
                item.setItem(null);
                item.setShade(null);
                item.setUnit(null);  // Yarn has no unit
                return item;
            }

            // ---------------------------------------------------------
            // CASE 2: Material selected (Normal flow)
            // ---------------------------------------------------------
            MaterialGroup group = materialGroupRepo.findById(itemDto.getMaterialGroupId())
                    .orElseThrow(() -> new RuntimeException("Material Group not found"));

            Material material = materialRepo.findById(itemDto.getMaterialId())
                    .orElseThrow(() -> new RuntimeException("Material not found"));

            Shade shade = (itemDto.getShadeCode() != null)
                    ? shadeRepo.findById(itemDto.getShadeCode())
                    .orElse(null)
                    : null;

            item.setMaterialGroup(group);
            item.setItem(material);
            item.setShade(shade);
            item.setUnit(material.getMaterialUnit());

            return item;

        }).collect(Collectors.toList());

        order.setItems(items);
        return orderRepo.save(order);
    }


    @Override
    public PurchaseOrder getOrder(Long id) {
        return orderRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found"));
    }

    @Override
    public List<PurchaseOrder> getAllOrders() {
        return orderRepo.findAll();
    }

    @Override
    public PurchaseOrder updateOrder(Long id, PurchaseOrderRequestDTO dto) {

        PurchaseOrder existing = orderRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        Party party = partyRepo.findById(dto.getPartyId())
                .orElseThrow(() -> new RuntimeException("Party not found"));

        existing.setOrderNo(dto.getOrderNo());
        existing.setDate(dto.getDate());
        existing.setParty(party);

        itemRepo.deleteAll(existing.getItems());

        List<PurchaseOrderItem> updatedItems = dto.getItems().stream().map(itemDto -> {

            PurchaseOrderItem item = new PurchaseOrderItem();
            item.setPurchaseOrder(existing);
            item.setRoll(itemDto.getRoll());
            item.setQuantity(itemDto.getQuantity());
            item.setRate(itemDto.getRate());
            item.setAmount(itemDto.getAmount());
            item.setYarnName(itemDto.getYarnName()); // Yarn string

            // -----------------------------------------------------
            // CASE 1: Yarn Name Only
            // -----------------------------------------------------
            if (itemDto.getMaterialId() == null) {
                item.setMaterialGroup(null);
                item.setItem(null);
                item.setShade(null);
                item.setUnit(null);
                return item;
            }

            // -----------------------------------------------------
            // CASE 2: Material Selected
            // -----------------------------------------------------
            MaterialGroup group = materialGroupRepo.findById(itemDto.getMaterialGroupId())
                    .orElseThrow(() -> new RuntimeException("Material Group not found"));

            Material material = materialRepo.findById(itemDto.getMaterialId())
                    .orElseThrow(() -> new RuntimeException("Material not found"));

            Shade shade = (itemDto.getShadeCode() != null)
                    ? shadeRepo.findById(itemDto.getShadeCode()).orElse(null)
                    : null;

            item.setMaterialGroup(group);
            item.setItem(material);
            item.setShade(shade);
            item.setUnit(material.getMaterialUnit());

            return item;

        }).collect(Collectors.toList());

        existing.setItems(updatedItems);
        return orderRepo.save(existing);
    }


    @Override
    public void deleteOrder(Long id) {
        PurchaseOrder order = orderRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found"));
        itemRepo.deleteAll(order.getItems());
        orderRepo.delete(order);
    }

    @Override
    public void issueToPurchaseEntity(Long orderId) {
        PurchaseOrder order = orderRepo.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));
        // Your existing logic stays here
    }

    // ✅ NEW METHOD: Return all orders as DTOs (used by controller)
    public List<PurchaseOrderResponseDTO> getAllOrderResponses() {
        return orderRepo.findAll().stream().map(order -> {
            PurchaseOrderResponseDTO dto = new PurchaseOrderResponseDTO();
            dto.setId(order.getId());
            dto.setOrderNo(order.getOrderNo());
            dto.setDate(order.getDate());
            dto.setPartyName(order.getParty() != null ? order.getParty().getPartyName() : "(Unknown Party)");
            


            List<PurchaseOrderItemDTO> itemDTOs = order.getItems().stream().map(item -> {
                PurchaseOrderItemDTO itemDto = new PurchaseOrderItemDTO();
                itemDto.setMaterialGroupId(item.getItem() !=null ? item.getItem().getId() : null);
                itemDto.setMaterialId(item.getItem() != null ? item.getItem().getId() : null);
                itemDto.setMaterialName(item.getItem() != null ? item.getItem().getMaterialName() : null);
                itemDto.setShadeCode(item.getShade() != null ? item.getShade().getShadeCode() : null);
                itemDto.setRoll(item.getRoll());
                itemDto.setQuantity(item.getQuantity());
                itemDto.setRate(item.getRate());
                itemDto.setAmount(item.getAmount());
                itemDto.setUnit(item.getUnit());
                itemDto.setYarnName(item.getYarnName());
                return itemDto;
            }).collect(Collectors.toList());

            dto.setItems(itemDTOs);
            return dto;
        }).collect(Collectors.toList());
    }
    
    //For Purchase Pending ORder logic
//    @Override
//    public List<PurchasePendingOrdersDTO> getPendingOrders() {
//        return itemRepo.getPendingOrders();
//    }

}

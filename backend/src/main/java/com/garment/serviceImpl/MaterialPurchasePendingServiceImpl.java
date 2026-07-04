package com.garment.serviceImpl;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.garment.DTO.MaterialPurchasePendingRequest;
import com.garment.DTO.MaterialPurchasePendingRowDTO;
import com.garment.repository.MaterialPurchasePendingRepository;
import com.garment.repository.MaterialPurchasePendingRepository.PendingRowProjection;
import com.garment.service.MaterialPurchasePendingService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MaterialPurchasePendingServiceImpl implements MaterialPurchasePendingService {

    private final MaterialPurchasePendingRepository repo;

    @Override
    public List<MaterialPurchasePendingRowDTO> getPending(MaterialPurchasePendingRequest req) {
        if (req.getDate() == null) {
            throw new IllegalArgumentException("date is required");
        }

        boolean partyEmpty = (req.getPartyIds() == null || req.getPartyIds().isEmpty());
        boolean itemEmpty  = (req.getItemIds()  == null || req.getItemIds().isEmpty());

        // IMPORTANT for native IN (:list): avoid empty list binding errors
        List<Long> safePartyIds = partyEmpty ? Collections.singletonList(-1L) : req.getPartyIds();
        List<Long> safeItemIds  = itemEmpty  ? Collections.singletonList(-1L) : req.getItemIds();

        var rows = repo.findPendingReport(
                req.getDate(),
                safePartyIds, partyEmpty,
                safeItemIds, itemEmpty
        );

        return rows.stream().map(this::map).collect(Collectors.toList());
    }

    private MaterialPurchasePendingRowDTO map(PendingRowProjection p) {
        return new MaterialPurchasePendingRowDTO(
                p.getId(),
                p.getOrderNo(),
                p.getOrderDate(),
                p.getPartyName(),
                p.getItemName(),
                round3(p.getOrderReceived()),
                round3(p.getOrderDelivered()),
                round3(p.getOrderPending())
        );
    }

    private Double round3(Double v) {
        if (v == null) return 0d;
        return Math.round(v * 1000d) / 1000d;
    }

    @Override
    public List<Object[]> getPartiesByCategoryPurchase() {
        return repo.distinctPurchaseParties();
    }

    @Override
    public List<Object[]> getMaterials() {
        return repo.distinctMaterialsFromPO();
    }

    @Override
    public List<MaterialPurchasePendingRowDTO> getPending() {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'getPending'");
    }
}
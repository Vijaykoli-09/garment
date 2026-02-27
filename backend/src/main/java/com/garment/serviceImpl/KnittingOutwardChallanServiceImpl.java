package com.garment.serviceImpl;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.garment.DTO.KnittingOutwardChallanDTO;
import com.garment.DTO.KnittingOutwardChallanRowDTO;
import com.garment.model.KnittingOutwardChallan;
import com.garment.model.KnittingOutwardChallanRow;
import com.garment.model.Material;
import com.garment.model.Party;
import com.garment.model.Shade;
import com.garment.repository.KnittingOutwardChallanRepository;
import com.garment.repository.KnittingOutwardChallanRowRepository;
import com.garment.repository.MaterialRepository;
import com.garment.repository.PartyRepository;
import com.garment.repository.ShadeRepository;
import com.garment.service.KnittingOutwardChallanService;
import com.garment.service.MaterialStockService;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class KnittingOutwardChallanServiceImpl implements KnittingOutwardChallanService {

    private final KnittingOutwardChallanRepository challanRepo;
    private final KnittingOutwardChallanRowRepository rowRepo;
    private final PartyRepository partyRepo;
    private final MaterialRepository materialRepo;
    private final ShadeRepository shadeRepo;
    private final MaterialStockService materialStockService; // ✅ ADDED

 // ✅ Save new challan
    @Override
    @Transactional
    public KnittingOutwardChallan saveEntry(KnittingOutwardChallanDTO dto) {
        Party party = partyRepo.findById(dto.getPartyId())
                .orElseThrow(() -> new RuntimeException("Party not found"));

        KnittingOutwardChallan challan = new KnittingOutwardChallan();
        challan.setDate(dto.getDate());
        challan.setParty(party);
        challan.setChallanNo(dto.getChallanNo());

        List<KnittingOutwardChallanRow> rows = dto.getItems().stream().map(rowDto -> {

            Material material = rowDto.getMaterialId() != null
                    ? materialRepo.findById(rowDto.getMaterialId())
                        .orElseThrow(() -> new RuntimeException("Material not found: " + rowDto.getMaterialId()))
                    : null;

            Shade shade = rowDto.getShadeCode() != null && !rowDto.getShadeCode().isBlank()
                    ? shadeRepo.findById(rowDto.getShadeCode())
                        .orElseThrow(() -> new RuntimeException("Shade not found: " + rowDto.getShadeCode()))
                    : null;

            KnittingOutwardChallanRow row = new KnittingOutwardChallanRow();
            row.setKnittingOutwardChallan(challan);
            row.setMaterial(material);
            row.setShade(shade);
            row.setRoll(rowDto.getRoll());
            row.setWtPerBox(rowDto.getWtPerBox());
            row.setWeight(rowDto.getWeight());
            row.setRate(rowDto.getRate());
            row.setAmount(rowDto.getAmount());
            row.setOrderNo(rowDto.getOrderNo());
            row.setUnit(material != null ? material.getMaterialUnit() : null);

            return row;
        }).collect(Collectors.toList());

        challan.setItems(rows);

        KnittingOutwardChallan saved = challanRepo.save(challan);

        // ✅ After saving, update material stock (debit)
        saved.getItems().forEach(row -> {
            materialStockService.debitStockFromKnittingOutward(row);
        });

        return saved;
    }


    // ✅ Get one challan by ID
    @Override
    public KnittingOutwardChallan getEntry(Long id) {
        return challanRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Challan not found with ID: " + id));
    }

    // ✅ Get all challans
    @Override
    public List<KnittingOutwardChallan> getAllEntries() {
        return challanRepo.findAll();
    }

    //Update Chllan
    @Override
    @Transactional
    public KnittingOutwardChallan updateEntry(Long id, KnittingOutwardChallanDTO dto) {

        KnittingOutwardChallan existing = challanRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Challan not found"));

        Party party = partyRepo.findById(dto.getPartyId())
                .orElseThrow(() -> new RuntimeException("Party not found"));

        existing.setDate(dto.getDate());
        existing.setParty(party);
        existing.setChallanNo(dto.getChallanNo());

        // ✅ Remove old child records properly 
        List<KnittingOutwardChallanRow> oldRows = new ArrayList<>(existing.getItems());
        for (KnittingOutwardChallanRow row : oldRows) {
            existing.getItems().remove(row);
        }

        // ✅ Add new rows without replacing list reference
        for (KnittingOutwardChallanRowDTO rowDto : dto.getItems()) {

            Material material = materialRepo.findById(rowDto.getMaterialId())
                    .orElseThrow(() -> new RuntimeException("Material not found: " + rowDto.getMaterialId()));

            Shade shade = null;
            if (rowDto.getShadeCode() != null && !rowDto.getShadeCode().isBlank()) {
                shade = shadeRepo.findById(rowDto.getShadeCode())
                        .orElseThrow(() -> new RuntimeException("Shade not found: " + rowDto.getShadeCode()));
            }

            KnittingOutwardChallanRow newRow = new KnittingOutwardChallanRow();
            newRow.setKnittingOutwardChallan(existing);
            newRow.setMaterial(material);
            newRow.setShade(shade);
            newRow.setRoll(rowDto.getRoll());
            newRow.setWtPerBox(rowDto.getWtPerBox());
            newRow.setWeight(rowDto.getWeight());
            newRow.setRate(rowDto.getRate());
            newRow.setAmount(rowDto.getAmount());
            newRow.setOrderNo(rowDto.getOrderNo());
            newRow.setUnit(material.getMaterialUnit());

            existing.getItems().add(newRow);
        }

        // ✅ Save parent & children
        KnittingOutwardChallan updated = challanRepo.save(existing);

        // ✅ Re-debit stock
        updated.getItems().forEach(row -> materialStockService.debitStockFromKnittingOutward(row));

        return updated;
    }





    // ✅ Delete challan
    @Override
    public void deleteEntry(Long id) {
        KnittingOutwardChallan challan = challanRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Challan not found"));
        rowRepo.deleteAll(challan.getItems());
        challanRepo.delete(challan);
    }
}

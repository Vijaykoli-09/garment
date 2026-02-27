package com.garment.service;

import com.garment.DTO.FinishingInwardDTO;
import com.garment.DTO.FinishingInwardRowDTO;
import com.garment.model.FinishingInward;
import com.garment.model.FinishingInwardRow;
import com.garment.repository.FinishingInwardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FinishingInwardService {

    private final FinishingInwardRepository finishingInwardRepository;

    // Create FinishingInward
    public FinishingInwardDTO createFinishingInward(FinishingInwardDTO dto) {
        FinishingInward finishingInward = new FinishingInward();
        copyDTOToEntity(dto, finishingInward);
        FinishingInward saved = finishingInwardRepository.save(finishingInward);
        return convertToDTO(saved);
    }

    // Update FinishingInward by ID
    public FinishingInwardDTO updateFinishingInward(Long id, FinishingInwardDTO dto) {
        FinishingInward finishingInward = finishingInwardRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("FinishingInward not found with id: " + id));

        copyDTOToEntity(dto, finishingInward);
        FinishingInward saved = finishingInwardRepository.save(finishingInward);
        return convertToDTO(saved);
    }

    // Get all
    public List<FinishingInwardDTO> getAllFinishingInwards() {
        return finishingInwardRepository.findAll()
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    // Get by ID
    public FinishingInwardDTO getFinishingInwardById(Long id) {
        return finishingInwardRepository.findById(id)
                .map(this::convertToDTO)
                .orElse(null);
    }

    // Delete
    public void deleteFinishingInward(Long id) {
        finishingInwardRepository.deleteById(id);
    }

    // -------------------
    // Utility Methods
    // -------------------

    // Copy DTO fields to entity (for create & update)
    private void copyDTOToEntity(FinishingInwardDTO dto, FinishingInward entity) {
        entity.setChallanNo(dto.getChallanNo());
        entity.setDated(dto.getDated());
        entity.setPartyName(dto.getPartyName());
        entity.setVehicleNo(dto.getVehicleNo());
        entity.setThrough(dto.getThrough());

        // Clear existing rows (if updating)
        entity.getRows().clear();

        if (dto.getRows() != null) {
            for (FinishingInwardRowDTO rowDTO : dto.getRows()) {
                FinishingInwardRow row = new FinishingInwardRow();
                row.setLotNo(rowDTO.getLotNo());
                row.setItemName(rowDTO.getItemName());
                row.setProcessing(rowDTO.getProcessing());
                row.setWastage(rowDTO.getWastage());
                row.setExtraWt(rowDTO.getExtraWt());
                row.setShade(rowDTO.getShade());
                // row.setStockRate(rowDTO.getStockRate());
                row.setRateFND(rowDTO.getRateFND());
                row.setRolls(rowDTO.getRolls());
                row.setWeight(rowDTO.getWeight());
                row.setRate(rowDTO.getRate());
                row.setAmount(rowDTO.getAmount());

                entity.addRow(row); // set bidirectional mapping
            }
        }
    }

    // Convert Entity -> DTO
    private FinishingInwardDTO convertToDTO(FinishingInward entity) {
        List<FinishingInwardRowDTO> rows = entity.getRows()
                .stream()
                .map(row -> new FinishingInwardRowDTO(
                        row.getId(),
                        row.getLotNo(),
                        row.getItemName(),
                        row.getProcessing(),
                        row.getWastage(),
                        row.getExtraWt(),
                        row.getShade(),
                        // row.getStockRate(),
                        row.getRateFND(),
                        row.getRolls(),
                        row.getWeight(),
                        row.getRate(),
                        row.getAmount()))
                .collect(Collectors.toList());

        return new FinishingInwardDTO(
                entity.getId(),
                entity.getChallanNo(),
                entity.getDated(),
                entity.getPartyName(),
                entity.getVehicleNo(),
                entity.getThrough(),
                rows);
    }
}

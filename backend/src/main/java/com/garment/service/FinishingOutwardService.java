package com.garment.service;

import com.garment.DTO.FinishingOutwardDTO;
import com.garment.DTO.FinishingOutwardRowDTO;
import com.garment.model.FinishingOutward;
import com.garment.model.FinishingOutwardRow;
import com.garment.repository.FinishingOutwardRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FinishingOutwardService {

    private final FinishingOutwardRepository finishingOutwardRepository;

    // =========================
    // Conversion Helpers
    // =========================

    private FinishingOutward convertToEntity(FinishingOutwardDTO dto) {
        FinishingOutward entity = new FinishingOutward();

        if (dto.getId() != null) entity.setId(dto.getId());

        entity.setChallanNo(dto.getChallanNo());
        entity.setDated(dto.getDated());
        entity.setPartyName(dto.getPartyName());
        entity.setNarration(dto.getNarration());
        entity.setVehicleNo(dto.getVehicleNo());
        entity.setThrough(dto.getThrough());

        if (dto.getRows() != null) {
            dto.getRows().stream()
                    .map(this::convertToRowEntity)
                    .forEach(entity::addRow);
        }
        return entity;
    }

    private FinishingOutwardRow convertToRowEntity(FinishingOutwardRowDTO dto) {
        FinishingOutwardRow rowEntity = new FinishingOutwardRow();
        rowEntity.setId(dto.getId());
        rowEntity.setLotNo(dto.getLotNo());
        rowEntity.setItemName(dto.getItemName());
        rowEntity.setShade(dto.getShade());
        rowEntity.setRolls(dto.getRolls());
        rowEntity.setWeight(dto.getWeight());
        rowEntity.setRateFND(dto.getRateFND());
        rowEntity.setClothWt(dto.getClothWt());
        rowEntity.setRibWt(dto.getRibWt());

        // ✅ NEW
        rowEntity.setShortage(dto.getShortage());
        rowEntity.setPercentage(dto.getPercentage());

        rowEntity.setAmount(dto.getAmount());
        return rowEntity;
    }

    private FinishingOutwardDTO convertToDto(FinishingOutward entity) {
        FinishingOutwardDTO dto = new FinishingOutwardDTO();
        dto.setId(entity.getId());
        dto.setChallanNo(entity.getChallanNo());
        dto.setDated(entity.getDated());
        dto.setPartyName(entity.getPartyName());
        dto.setNarration(entity.getNarration());
        dto.setVehicleNo(entity.getVehicleNo());
        dto.setThrough(entity.getThrough());

        List<FinishingOutwardRowDTO> rowDtos = entity.getRows().stream()
                .map(this::convertToRowDto)
                .collect(Collectors.toList());
        dto.setRows(rowDtos);

        return dto;
    }

    private FinishingOutwardRowDTO convertToRowDto(FinishingOutwardRow rowEntity) {
        return new FinishingOutwardRowDTO(
                rowEntity.getId(),
                rowEntity.getLotNo(),
                rowEntity.getItemName(),
                rowEntity.getShade(),
                rowEntity.getRolls(),
                rowEntity.getWeight(),
                rowEntity.getRateFND(),
                rowEntity.getClothWt(),
                rowEntity.getRibWt(),
                // ✅ NEW
                rowEntity.getShortage(),
                rowEntity.getPercentage(),
                rowEntity.getAmount()
        );
    }

    // =========================
    // CRUD
    // =========================

    @Transactional
    public FinishingOutwardDTO createOutward(FinishingOutwardDTO dto) {
        FinishingOutward entity = convertToEntity(dto);
        FinishingOutward savedEntity = finishingOutwardRepository.save(entity);
        return convertToDto(savedEntity);
    }

    @Transactional(readOnly = true)
    public FinishingOutwardDTO getOutwardById(Long id) {
        FinishingOutward entity = finishingOutwardRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Finishing Outward not found with id: " + id));
        return convertToDto(entity);
    }

    @Transactional(readOnly = true)
    public List<FinishingOutwardDTO> getAllOutwards() {
        return finishingOutwardRepository.findAll().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public FinishingOutwardDTO updateOutward(Long id, FinishingOutwardDTO dto) {
        FinishingOutward existingEntity = finishingOutwardRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Finishing Outward not found with id: " + id));

        existingEntity.getRows().clear();

        existingEntity.setChallanNo(dto.getChallanNo());
        existingEntity.setDated(dto.getDated());
        existingEntity.setPartyName(dto.getPartyName());
        existingEntity.setNarration(dto.getNarration());
        existingEntity.setVehicleNo(dto.getVehicleNo());
        existingEntity.setThrough(dto.getThrough());

        if (dto.getRows() != null) {
            dto.getRows().stream()
                    .map(this::convertToRowEntity)
                    .forEach(existingEntity::addRow);
        }

        FinishingOutward updatedEntity = finishingOutwardRepository.save(existingEntity);
        return convertToDto(updatedEntity);
    }

    @Transactional
    public void deleteOutward(Long id) {
        if (!finishingOutwardRepository.existsById(id)) {
            throw new EntityNotFoundException("Finishing Outward not found with id: " + id);
        }
        finishingOutwardRepository.deleteById(id);
    }
}
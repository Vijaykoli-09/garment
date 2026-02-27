package com.garment.service;

import com.garment.DTO.FinishingOutwardDTO;
import com.garment.DTO.FinishingOutwardRowDTO;
import com.garment.model.FinishingOutward;
import com.garment.model.FinishingOutwardRow;
import com.garment.repository.FinishingOutwardRepository;
import com.garment.repository.FinishingOutwardRowRepository; // Though typically only the main repo is needed for cascade operations
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
    // Injecting row repository is optional if all logic is handled via the parent

    // =========================================================================
    // Private Conversion Methods (Helper for Service)
    // =========================================================================

    private FinishingOutward convertToEntity(FinishingOutwardDTO dto) {
        FinishingOutward entity = new FinishingOutward();

        // ID is usually set only during update operations
        if (dto.getId() != null) {
            entity.setId(dto.getId());
        }

        entity.setChallanNo(dto.getChallanNo());
        entity.setDated(dto.getDated());
        entity.setPartyName(dto.getPartyName());
        entity.setNarration(dto.getNarration());
        entity.setVehicleNo(dto.getVehicleNo());
        entity.setThrough(dto.getThrough());

        // Convert Rows DTOs to Row Entities and set bidirectional relationship
        if (dto.getRows() != null) {
            dto.getRows().stream()
                    .map(this::convertToRowEntity)
                    .forEach(entity::addRow); // Uses the helper method in the FinishingOutward entity
        }
        return entity;
    }

    private FinishingOutwardRow convertToRowEntity(FinishingOutwardRowDTO dto) {
        FinishingOutwardRow rowEntity = new FinishingOutwardRow();
        rowEntity.setId(dto.getId());
        // rowEntity.setLotInternalNo(dto.getLotInternalNo());
        rowEntity.setLotNo(dto.getLotNo());
        rowEntity.setItemName(dto.getItemName());
        rowEntity.setShade(dto.getShade());
        rowEntity.setMcSize(dto.getMcSize());
        rowEntity.setGreyGSM(dto.getGreyGSM());
        rowEntity.setRegdGSM(dto.getRegdGSM());
        rowEntity.setRolls(dto.getRolls());
        rowEntity.setWeight(dto.getWeight());
        rowEntity.setRateFND(dto.getRateFND());
        // rowEntity.setRate(dto.getRate());
        rowEntity.setClothWt(dto.getClothWt());
        rowEntity.setRibWt(dto.getRibWt());
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

        // Convert Row Entities to Row DTOs
        List<FinishingOutwardRowDTO> rowDtos = entity.getRows().stream()
                .map(this::convertToRowDto)
                .collect(Collectors.toList());
        dto.setRows(rowDtos);

        return dto;
    }

    private FinishingOutwardRowDTO convertToRowDto(FinishingOutwardRow rowEntity) {
        return new FinishingOutwardRowDTO(
                rowEntity.getId(),
                // rowEntity.getLotInternalNo(),
                rowEntity.getLotNo(),
                rowEntity.getItemName(),
                rowEntity.getShade(),
                rowEntity.getMcSize(),
                rowEntity.getGreyGSM(),
                rowEntity.getRegdGSM(),
                rowEntity.getRolls(),
                rowEntity.getWeight(),
                rowEntity.getRateFND(),
                // rowEntity.getRate(),
                rowEntity.getClothWt(),
                rowEntity.getRibWt(),
                rowEntity.getAmount());
    }

    // =========================================================================
    // Service Methods (CRUD)
    // =========================================================================

    /**
     * Creates a new FinishingOutward record along with its associated rows.
     * 
     * @param dto The DTO containing header and row data.
     * @return The saved DTO with generated ID.
     */
    @Transactional
    public FinishingOutwardDTO createOutward(FinishingOutwardDTO dto) {
        // Convert DTO to Entity
        FinishingOutward entity = convertToEntity(dto);

        // Save the parent entity (JPA cascade saves the children automatically)
        FinishingOutward savedEntity = finishingOutwardRepository.save(entity);

        // Convert the saved Entity back to DTO and return
        return convertToDto(savedEntity);
    }

    /**
     * Retrieves a FinishingOutward record by its ID.
     * 
     * @param id The ID of the record.
     * @return The found record as a DTO.
     */
    @Transactional(readOnly = true)
    public FinishingOutwardDTO getOutwardById(Long id) {
        FinishingOutward entity = finishingOutwardRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Finishing Outward not found with id: " + id));

        return convertToDto(entity);
    }

    /**
     * Retrieves all FinishingOutward records.
     * 
     * @return A list of all records as DTOs.
     */
    @Transactional(readOnly = true)
    public List<FinishingOutwardDTO> getAllOutwards() {
        return finishingOutwardRepository.findAll().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * Updates an existing FinishingOutward record.
     * Note: A robust update implementation should handle complex changes
     * in the OneToMany collection (deletions/updates/new additions to rows).
     * 
     * @param id  The ID of the record to update.
     * @param dto The DTO containing the new data.
     * @return The updated record as a DTO.
     */
    @Transactional
    public FinishingOutwardDTO updateOutward(Long id, FinishingOutwardDTO dto) {
        FinishingOutward existingEntity = finishingOutwardRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Finishing Outward not found with id: " + id));

        // A simple update approach (rely on cascade/orphanRemoval for rows)
        // 1. Clear existing rows (triggers orphanRemoval for rows not present in the
        // new set)
        existingEntity.getRows().clear();

        // 2. Update header fields
        existingEntity.setChallanNo(dto.getChallanNo());
        existingEntity.setDated(dto.getDated());
        existingEntity.setPartyName(dto.getPartyName());
        existingEntity.setNarration(dto.getNarration());
        existingEntity.setVehicleNo(dto.getVehicleNo());
        existingEntity.setThrough(dto.getThrough());

        // 3. Add new/updated rows from DTO
        if (dto.getRows() != null) {
            dto.getRows().stream()
                    .map(this::convertToRowEntity)
                    .forEach(existingEntity::addRow);
        }

        // Save and return
        FinishingOutward updatedEntity = finishingOutwardRepository.save(existingEntity);
        return convertToDto(updatedEntity);
    }

    /**
     * Deletes a FinishingOutward record by its ID.
     * 
     * @param id The ID of the record to delete.
     */
    @Transactional
    public void deleteOutward(Long id) {
        if (!finishingOutwardRepository.existsById(id)) {
            throw new EntityNotFoundException("Finishing Outward not found with id: " + id);
        }
        finishingOutwardRepository.deleteById(id);
    }
}
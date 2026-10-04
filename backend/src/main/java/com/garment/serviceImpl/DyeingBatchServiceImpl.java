package com.garment.serviceImpl;

import com.garment.DTO.DyeingBatchDTO;
import com.garment.DTO.DyeingBatchLotDTO;
import com.garment.model.DyeingBatch;
import com.garment.model.DyeingBatchLot;
import com.garment.repository.DyeingBatchRepository;
import com.garment.service.DyeingBatchService;

import jakarta.persistence.EntityNotFoundException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

@Service
@Transactional
public class DyeingBatchServiceImpl
        implements DyeingBatchService {

    private final DyeingBatchRepository repository;

    public DyeingBatchServiceImpl(
            DyeingBatchRepository repository
    ) {
        this.repository = repository;
    }

    // =========================================================
    // SAVE
    // =========================================================

    @Override
    public DyeingBatchDTO save(
            DyeingBatchDTO dto
    ) {

        if (dto == null) {
            throw new IllegalArgumentException(
                    "Batch data is required"
            );
        }

        if (dto.getPartyName() == null ||
                dto.getPartyName().trim().isEmpty()) {

            throw new IllegalArgumentException(
                    "Party is required"
            );
        }

        if (dto.getBatchName() == null ||
                dto.getBatchName().trim().isEmpty()) {

            throw new IllegalArgumentException(
                    "Batch name is required"
            );
        }

        if (dto.getLots() == null ||
                dto.getLots().isEmpty()) {

            throw new IllegalArgumentException(
                    "At least one lot is required"
            );
        }

        String partyName =
                dto.getPartyName().trim();

        String batchName =
                dto.getBatchName().trim();

        if (repository
                .existsByPartyNameIgnoreCaseAndBatchNameIgnoreCase(
                        partyName,
                        batchName
                )) {

            throw new IllegalArgumentException(
                    "This batch name already exists for this party"
            );
        }

        DyeingBatch batch =
                new DyeingBatch();

        batch.setPartyName(
                partyName
        );

        batch.setBatchName(
                batchName
        );

        batch.setCreatedAt(
                LocalDateTime.now()
        );

        for (DyeingBatchLotDTO lotDTO :
                dto.getLots()) {

            DyeingBatchLot lot =
                    convertLotDTOToEntity(
                            lotDTO
                    );

            batch.addLot(lot);
        }

        DyeingBatch saved =
                repository.save(batch);

        return convertToDTO(saved);
    }

    // =========================================================
    // UPDATE
    // =========================================================

    @Override
    public DyeingBatchDTO update(
            Long id,
            DyeingBatchDTO dto
    ) {

        DyeingBatch existing =
                repository.findById(id)
                        .orElseThrow(
                                () ->
                                        new EntityNotFoundException(
                                                "Dyeing Batch not found: "
                                                        + id
                                        )
                        );

        if (dto.getPartyName() == null ||
                dto.getPartyName().trim().isEmpty()) {

            throw new IllegalArgumentException(
                    "Party is required"
            );
        }

        if (dto.getBatchName() == null ||
                dto.getBatchName().trim().isEmpty()) {

            throw new IllegalArgumentException(
                    "Batch name is required"
            );
        }

        if (dto.getLots() == null ||
                dto.getLots().isEmpty()) {

            throw new IllegalArgumentException(
                    "At least one lot is required"
            );
        }

        String partyName =
                dto.getPartyName().trim();

        String batchName =
                dto.getBatchName().trim();

        if (repository
                .existsByPartyNameIgnoreCaseAndBatchNameIgnoreCaseAndIdNot(
                        partyName,
                        batchName,
                        id
                )) {

            throw new IllegalArgumentException(
                    "This batch name already exists for this party"
            );
        }

        existing.setPartyName(
                partyName
        );

        existing.setBatchName(
                batchName
        );

        /*
         * Delete old lots and save new lots.
         */
        existing.getLots().clear();

        for (DyeingBatchLotDTO lotDTO :
                dto.getLots()) {

            DyeingBatchLot lot =
                    convertLotDTOToEntity(
                            lotDTO
                    );

            existing.addLot(lot);
        }

        DyeingBatch saved =
                repository.save(existing);

        return convertToDTO(saved);
    }

    // =========================================================
    // FIND ALL
    // =========================================================

    @Override
    @Transactional(readOnly = true)
    public List<DyeingBatchDTO> findAll() {

        List<DyeingBatch> batches =
                repository.findAllByOrderByCreatedAtDesc();

        List<DyeingBatchDTO> result =
                new ArrayList<>();

        for (DyeingBatch batch :
                batches) {

            result.add(
                    convertToDTO(batch)
            );
        }

        return result;
    }

    // =========================================================
    // FIND BY ID
    // =========================================================

    @Override
    @Transactional(readOnly = true)
    public DyeingBatchDTO findById(
            Long id
    ) {

        DyeingBatch batch =
                repository.findById(id)
                        .orElseThrow(
                                () ->
                                        new EntityNotFoundException(
                                                "Dyeing Batch not found: "
                                                        + id
                                        )
                        );

        return convertToDTO(batch);
    }

    // =========================================================
    // DELETE
    // =========================================================

    @Override
    public void delete(
            Long id
    ) {

        if (!repository.existsById(id)) {

            throw new EntityNotFoundException(
                    "Dyeing Batch not found: " + id
            );
        }

        repository.deleteById(id);
    }

    // =========================================================
    // ENTITY -> DTO
    // =========================================================

    private DyeingBatchDTO convertToDTO(
            DyeingBatch entity
    ) {

        DyeingBatchDTO dto =
                new DyeingBatchDTO();

        dto.setId(
                entity.getId()
        );

        dto.setBatchName(
                entity.getBatchName()
        );

        dto.setPartyName(
                entity.getPartyName()
        );

        dto.setCreatedAt(
                entity.getCreatedAt()
        );

        List<DyeingBatchLotDTO> lotDTOs =
                new ArrayList<>();

        if (entity.getLots() != null) {

            for (DyeingBatchLot lot :
                    entity.getLots()) {

                DyeingBatchLotDTO lotDTO =
                        convertLotEntityToDTO(
                                lot
                        );

                lotDTOs.add(lotDTO);
            }
        }

        dto.setLots(
                lotDTOs
        );

        return dto;
    }

    // =========================================================
    // LOT ENTITY -> DTO
    // =========================================================

    private DyeingBatchLotDTO
    convertLotEntityToDTO(
            DyeingBatchLot entity
    ) {

        DyeingBatchLotDTO dto =
                new DyeingBatchLotDTO();

        dto.setId(
                entity.getId()
        );

        dto.setInwardId(
                entity.getInwardId()
        );

        dto.setInwardRowId(
                entity.getInwardRowId()
        );

        String uniqueKey =
                entity.getInwardId()
                        + "-"
                        + (
                        entity.getInwardRowId() != null
                                ? entity.getInwardRowId()
                                : "0"
                )
                        + "-"
                        + entity.getLotNo();

        dto.setUniqueKey(
                uniqueKey
        );

        dto.setLotNo(
                entity.getLotNo()
        );

        // =====================================================
        // IMPORTANT FABRIC MAPPING
        // =====================================================

        dto.setFabric(
                entity.getFabric()
        );

        dto.setRolls(
                entity.getRolls()
        );

        dto.setWeight(
                entity.getWeight()
        );

        dto.setReceivedWeight(
                entity.getReceivedWeight()
        );

        dto.setShortage(
                entity.getShortage()
        );

        dto.setPercentage(
                entity.getPercentage()
        );

        dto.setDyeingRate(
                entity.getDyeingRate()
        );

        // Always return the calculated amount.
        dto.setAmount(
                calculateAmount(
                        entity.getWeight(),
                        entity.getDyeingRate()
                )
        );

        dto.setDate(
                entity.getDate()
        );

        dto.setChallanNo(
                entity.getChallanNo()
        );

        dto.setPartyName(
                entity.getPartyName()
        );

        return dto;
    }

    // =========================================================
    // LOT DTO -> ENTITY
    // =========================================================

    private DyeingBatchLot
    convertLotDTOToEntity(
            DyeingBatchLotDTO dto
    ) {

        if (dto.getInwardId() == null) {

            throw new IllegalArgumentException(
                    "Inward ID is required for lot"
            );
        }

        if (dto.getLotNo() == null ||
                dto.getLotNo().trim().isEmpty()) {

            throw new IllegalArgumentException(
                    "Lot number is required"
            );
        }

        DyeingBatchLot entity =
                new DyeingBatchLot();

        entity.setInwardId(
                dto.getInwardId()
        );

        entity.setInwardRowId(
                dto.getInwardRowId()
        );

        entity.setLotNo(
                dto.getLotNo()
        );

        // =====================================================
        // IMPORTANT FABRIC SAVE
        // =====================================================

        entity.setFabric(
                dto.getFabric()
        );

        entity.setRolls(
                dto.getRolls()
        );

        entity.setWeight(
                dto.getWeight()
        );

        entity.setReceivedWeight(
                dto.getReceivedWeight()
        );

        entity.setShortage(
                dto.getShortage()
        );

        entity.setPercentage(
                dto.getPercentage()
        );

        entity.setDyeingRate(
                dto.getDyeingRate()
        );

        // IMPORTANT:
        // Amount = Weight × Dyeing Rate
        // Never trust the amount sent by frontend.
        entity.setAmount(
                calculateAmount(
                        dto.getWeight(),
                        dto.getDyeingRate()
                )
        );

        entity.setDate(
                dto.getDate()
        );

        entity.setChallanNo(
                dto.getChallanNo()
        );

        entity.setPartyName(
                dto.getPartyName()
        );

        return entity;
    }


    // =========================================================
    // AMOUNT CALCULATION
    // =========================================================
    //
    // BUSINESS FORMULA:
    // Amount = Weight × Dyeing Rate
    //
    // Received Weight is NOT used for amount.
    // =========================================================

    private String calculateAmount(
            String weight,
            String dyeingRate
    ) {
        try {
            BigDecimal weightValue =
                    new BigDecimal(
                            weight == null ||
                                    weight.trim().isEmpty()
                                    ? "0"
                                    : weight.trim()
                    );

            BigDecimal rateValue =
                    new BigDecimal(
                            dyeingRate == null ||
                                    dyeingRate.trim().isEmpty()
                                    ? "0"
                                    : dyeingRate.trim()
                    );

            return weightValue
                    .multiply(rateValue)
                    .setScale(
                            2,
                            RoundingMode.HALF_UP
                    )
                    .toPlainString();

        } catch (NumberFormatException e) {
            return "0.00";
        }
    }

}

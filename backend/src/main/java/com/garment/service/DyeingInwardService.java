package com.garment.service;

import com.garment.DTO.DyeingInwardDTO;
import com.garment.DTO.DyeingInwardRowDTO;
import com.garment.model.DyeingInward;
import com.garment.model.DyeingInwardRow;
import com.garment.repository.DyeingInwardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DyeingInwardService {

    private final DyeingInwardRepository dyeingInwardRepository;

    @Transactional
    public DyeingInwardDTO save(DyeingInwardDTO dto) {
        DyeingInward dyeingInward = new DyeingInward();
        dyeingInward.setDated(parseDate(dto.getDated()));
        dyeingInward.setPartyName(dto.getPartyName());
        dyeingInward.setChallanNo(dto.getChallanNo());
        dyeingInward.setTransferToStock(dto.getTransferToStock() != null ? dto.getTransferToStock() : false);
        dyeingInward.setVehicleNo(dto.getVehicleNo());
        dyeingInward.setThrough(dto.getThrough());
        dyeingInward.setNarration(dto.getNarration());

        if (dto.getRows() != null) {
            for (DyeingInwardRowDTO rowDTO : dto.getRows()) {
                DyeingInwardRow row = new DyeingInwardRow();
                row.setFabricLotNo(rowDTO.getFabricLotNo());
                row.setFabric(rowDTO.getFabric());
                row.setShade(rowDTO.getShade());
                row.setMcSize(rowDTO.getMcSize());
                row.setGreyGSM(rowDTO.getGreyGSM());
                row.setRegdSize(rowDTO.getRegdSize());
                row.setRolls(rowDTO.getRolls());
                row.setWeight(rowDTO.getWeight());
                row.setWastage(rowDTO.getWastage());
                row.setKnittingYarnRate(rowDTO.getKnittingYarnRate());
                row.setDyeingRate(rowDTO.getDyeingRate());
                row.setAmount(rowDTO.getAmount());
                dyeingInward.addRow(row);
            }
        }

        DyeingInward saved = dyeingInwardRepository.save(dyeingInward);
        return convertToDTO(saved);
    }

    @Transactional
    public DyeingInwardDTO update(Long id, DyeingInwardDTO dto) {
        DyeingInward dyeingInward = dyeingInwardRepository.findById(id).orElse(null);
        
        if (dyeingInward != null) {
            dyeingInward.setDated(parseDate(dto.getDated()));
            dyeingInward.setPartyName(dto.getPartyName());
            dyeingInward.setChallanNo(dto.getChallanNo());
            dyeingInward.setTransferToStock(dto.getTransferToStock() != null ? dto.getTransferToStock() : false);
            dyeingInward.setVehicleNo(dto.getVehicleNo());
            dyeingInward.setThrough(dto.getThrough());
            dyeingInward.setNarration(dto.getNarration());

            dyeingInward.getRows().clear();

            if (dto.getRows() != null) {
                for (DyeingInwardRowDTO rowDTO : dto.getRows()) {
                    DyeingInwardRow row = new DyeingInwardRow();
                    row.setFabricLotNo(rowDTO.getFabricLotNo());
                    row.setFabric(rowDTO.getFabric());
                    row.setShade(rowDTO.getShade());
                    row.setMcSize(rowDTO.getMcSize());
                    row.setGreyGSM(rowDTO.getGreyGSM());
                    row.setRegdSize(rowDTO.getRegdSize());
                    row.setRolls(rowDTO.getRolls());
                    row.setWeight(rowDTO.getWeight());
                    row.setWastage(rowDTO.getWastage());
                    row.setKnittingYarnRate(rowDTO.getKnittingYarnRate());
                    row.setDyeingRate(rowDTO.getDyeingRate());
                    row.setAmount(rowDTO.getAmount());
                    dyeingInward.addRow(row);
                }
            }

            DyeingInward updated = dyeingInwardRepository.save(dyeingInward);
            return convertToDTO(updated);
        }
        
        return null;
    }

    @Transactional(readOnly = true)
    public List<DyeingInwardDTO> findAll() {
        return dyeingInwardRepository.findAllByOrderByIdDesc()
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DyeingInwardDTO findById(Long id) {
        return dyeingInwardRepository.findById(id)
                .map(this::convertToDTO)
                .orElse(null);
    }

    @Transactional
    public void deleteById(Long id) {
        dyeingInwardRepository.deleteById(id);
    }

    private DyeingInwardDTO convertToDTO(DyeingInward entity) {
        DyeingInwardDTO dto = new DyeingInwardDTO();
        dto.setId(entity.getId());
        dto.setDated(entity.getDated() != null ? entity.getDated().toString() : null);
        dto.setPartyName(entity.getPartyName());
        dto.setChallanNo(entity.getChallanNo());
        dto.setTransferToStock(entity.getTransferToStock());
        dto.setVehicleNo(entity.getVehicleNo());
        dto.setThrough(entity.getThrough());
        dto.setNarration(entity.getNarration());

        if (entity.getRows() != null) {
            List<DyeingInwardRowDTO> rowDTOs = entity.getRows().stream()
                    .map(this::convertRowToDTO)
                    .collect(Collectors.toList());
            dto.setRows(rowDTOs);
        }

        return dto;
    }

    private DyeingInwardRowDTO convertRowToDTO(DyeingInwardRow row) {
        DyeingInwardRowDTO dto = new DyeingInwardRowDTO();
        dto.setId(row.getId());
        dto.setFabricLotNo(row.getFabricLotNo());
        dto.setFabric(row.getFabric());
        dto.setShade(row.getShade());
        dto.setMcSize(row.getMcSize());
        dto.setGreyGSM(row.getGreyGSM());
        dto.setRegdSize(row.getRegdSize());
        dto.setRolls(row.getRolls());
        dto.setWeight(row.getWeight());
        dto.setWastage(row.getWastage());
        dto.setKnittingYarnRate(row.getKnittingYarnRate());
        dto.setDyeingRate(row.getDyeingRate());
        dto.setAmount(row.getAmount());
        return dto;
    }

    private LocalDate parseDate(String dateString) {
        if (dateString == null || dateString.isEmpty()) {
            return null;
        }
        
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        return LocalDate.parse(dateString, formatter);
    }
}
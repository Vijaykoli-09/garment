package com.garment.serviceImpl;

import com.garment.DTO.MaterialReturnDTO;
import com.garment.DTO.MaterialReturnRowDTO;
import com.garment.model.MaterialReturn;
import com.garment.model.MaterialReturnRow;
import com.garment.repository.MaterialReturnRepository;
import com.garment.service.MaterialReturnService;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class MaterialReturnServiceImpl implements MaterialReturnService {

    private final MaterialReturnRepository repository;

    public MaterialReturnServiceImpl(MaterialReturnRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional
    public MaterialReturn save(MaterialReturnDTO dto) {
        MaterialReturn entity = toEntity(dto);
        return repository.save(entity);
    }

    @Override
    @Transactional
    public MaterialReturn update(Long id, MaterialReturnDTO dto) {
        Optional<MaterialReturn> opt = repository.findById(id);
        if (opt.isPresent()) {
            MaterialReturn existing = opt.get();
            // Replace fields
            existing.setDocType(dto.docType);
            existing.setChallanNo(dto.challanNo);
            existing.setDated(dto.dated != null ? LocalDate.parse(dto.dated) : null);
            existing.setPartyName(dto.partyName);
            existing.setPartyId(dto.partyId);
            existing.setInwardId(dto.inwardId);
            existing.setVehicleNo(dto.vehicleNo);
            existing.setThrough(dto.through);
            existing.setNarration(dto.narration);
            existing.setTotalRolls(dto.totalRolls);
            existing.setTotalWeight(dto.totalWeight);
            existing.setTotalWastage(dto.totalWastage);

            // Clear and re-add rows
            existing.getRows().clear();
            if (dto.rows != null) {
                for (MaterialReturnRowDTO r : dto.rows) {
                    MaterialReturnRow row = new MaterialReturnRow();
                    row.setLotNo(r.lotNo);
                    row.setItem(r.item);
                    row.setShade(r.shade);
                    row.setProcessing(r.processing);
                    row.setRolls(r.rolls);
                    row.setWeight(r.weight);
                    row.setWastage(r.wastage);
                    row.setRemarks(r.remarks);
                    existing.addRow(row);
                }
            }
            return repository.save(existing);
        } else {
            // If not found, create new (simple behavior; adjust if needed)
            MaterialReturn entity = toEntity(dto);
            return repository.save(entity);
        }
    }

    @Override
    public List<MaterialReturn> findAll() {
        return repository.findAll();
    }

    @Override
    public Optional<MaterialReturn> findById(Long id) {
        return repository.findById(id);
    }

    @Override
    public void delete(Long id) {
        repository.deleteById(id);
    }

    private MaterialReturn toEntity(MaterialReturnDTO dto) {
        MaterialReturn m = new MaterialReturn();
        m.setDocType(dto.docType);
        m.setChallanNo(dto.challanNo);
        m.setDated(dto.dated != null ? LocalDate.parse(dto.dated) : null);
        m.setPartyName(dto.partyName);
        m.setPartyId(dto.partyId);
        m.setInwardId(dto.inwardId);
        m.setVehicleNo(dto.vehicleNo);
        m.setThrough(dto.through);
        m.setNarration(dto.narration);
        m.setTotalRolls(dto.totalRolls);
        m.setTotalWeight(dto.totalWeight);
        m.setTotalWastage(dto.totalWastage);

        if (dto.rows != null) {
            for (MaterialReturnRowDTO r : dto.rows) {
                MaterialReturnRow row = new MaterialReturnRow();
                row.setLotNo(r.lotNo);
                row.setItem(r.item);
                row.setShade(r.shade);
                row.setProcessing(r.processing);
                row.setRolls(r.rolls);
                row.setWeight(r.weight);
                row.setWastage(r.wastage);
                row.setRemarks(r.remarks);
                m.addRow(row);
            }
        }

        return m;
    }
}

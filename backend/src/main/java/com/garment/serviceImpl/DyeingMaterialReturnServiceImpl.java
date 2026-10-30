package com.garment.serviceImpl;

import com.garment.DTO.DyeingMaterialReturnDTO;
import com.garment.DTO.DyeingMaterialReturnRowDTO;
import com.garment.model.DyeingMaterialReturn;
import com.garment.model.DyeingMaterialReturnRow;
import com.garment.repository.DyeingMaterialReturnRepository;
import com.garment.service.DyeingMaterialReturnService;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class DyeingMaterialReturnServiceImpl
        implements DyeingMaterialReturnService {
    private final DyeingMaterialReturnRepository repository;

    public DyeingMaterialReturnServiceImpl(DyeingMaterialReturnRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional
    public DyeingMaterialReturn save(DyeingMaterialReturnDTO dto) {
        DyeingMaterialReturn entity = toEntity(dto);
        return repository.save(entity);
    }

    @Override
    @Transactional
    public DyeingMaterialReturn update(Long id, DyeingMaterialReturnDTO dto) {
        Optional<DyeingMaterialReturn> opt = repository.findById(id);
        if (opt.isPresent()) {
            DyeingMaterialReturn existing = opt.get();
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
                for (DyeingMaterialReturnRowDTO r : dto.rows) {
                    DyeingMaterialReturnRow row = new DyeingMaterialReturnRow();
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
            DyeingMaterialReturn entity = toEntity(dto);
            return repository.save(entity);
        }
    }

    @Override
    public List<DyeingMaterialReturn> findAll() {
        return repository.findAll();
    }

    @Override
    public Optional<DyeingMaterialReturn> findById(Long id) {
        return repository.findById(id);
    }

    @Override
    public void delete(Long id) {
        repository.deleteById(id);
    }

    private DyeingMaterialReturn toEntity(DyeingMaterialReturnDTO dto) {
        DyeingMaterialReturn m = new DyeingMaterialReturn();
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
            for (DyeingMaterialReturnRowDTO r : dto.rows) {
                DyeingMaterialReturnRow row = new DyeingMaterialReturnRow();
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

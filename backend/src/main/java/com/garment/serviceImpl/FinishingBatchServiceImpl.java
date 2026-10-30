package com.garment.serviceImpl;

import com.garment.DTO.FinishingBatchDTO;
import com.garment.DTO.FinishingBatchLotDTO;
import com.garment.model.FinishingBatch;
import com.garment.model.FinishingBatchLot;
import com.garment.repository.FinishingBatchRepository;
import com.garment.service.FinishingBatchService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@Transactional
public class FinishingBatchServiceImpl implements FinishingBatchService {
    private final FinishingBatchRepository repository;
    public FinishingBatchServiceImpl(FinishingBatchRepository repository) { this.repository = repository; }

    @Override
    public FinishingBatchDTO save(FinishingBatchDTO dto) {
        validate(dto);
        String party = dto.getPartyName().trim();
        String name = dto.getBatchName().trim();
        if (repository.existsByPartyNameIgnoreCaseAndBatchNameIgnoreCase(party, name))
            throw new IllegalArgumentException("This batch name already exists for this party");
        FinishingBatch entity = new FinishingBatch();
        entity.setPartyName(party);
        entity.setBatchName(name);
        entity.setBatchDate(dto.getBatchDate() == null ? LocalDate.now() : dto.getBatchDate());
        entity.setCreatedAt(LocalDateTime.now());
        for (FinishingBatchLotDTO lotDTO : dto.getLots()) entity.addLot(toEntity(lotDTO));
        return toDTO(repository.save(entity));
    }

    @Override
    public FinishingBatchDTO update(Long id, FinishingBatchDTO dto) {
        validate(dto);
        FinishingBatch entity = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Finishing batch not found: " + id));
        String party = dto.getPartyName().trim();
        String name = dto.getBatchName().trim();
        if (repository.existsByPartyNameIgnoreCaseAndBatchNameIgnoreCaseAndIdNot(party, name, id))
            throw new IllegalArgumentException("This batch name already exists for this party");
        entity.setPartyName(party);
        entity.setBatchName(name);
        entity.setBatchDate(dto.getBatchDate() == null ? entity.getBatchDate() : dto.getBatchDate());
        entity.clearLots();
        for (FinishingBatchLotDTO lotDTO : dto.getLots()) entity.addLot(toEntity(lotDTO));
        return toDTO(repository.save(entity));
    }

    @Override
    @Transactional(readOnly = true)
    public List<FinishingBatchDTO> findAll() {
        List<FinishingBatchDTO> result = new ArrayList<>();
        for (FinishingBatch b : repository.findAllByOrderByBatchDateDescCreatedAtDesc()) result.add(toDTO(b));
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public FinishingBatchDTO findById(Long id) {
        FinishingBatch entity = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Finishing batch not found: " + id));
        return toDTO(entity);
    }

    @Override
    public void delete(Long id) {
        if (!repository.existsById(id)) throw new EntityNotFoundException("Finishing batch not found: " + id);
        repository.deleteById(id);
    }

    private void validate(FinishingBatchDTO dto) {
        if (dto == null) throw new IllegalArgumentException("Batch data is required");
        if (dto.getPartyName() == null || dto.getPartyName().trim().isEmpty()) throw new IllegalArgumentException("Finishing party is required");
        if (dto.getBatchName() == null || dto.getBatchName().trim().isEmpty()) throw new IllegalArgumentException("Batch name is required");
        if (dto.getBatchDate() == null) dto.setBatchDate(LocalDate.now());
        if (dto.getLots() == null || dto.getLots().isEmpty()) throw new IllegalArgumentException("At least one inward lot is required");
    }

    private FinishingBatchDTO toDTO(FinishingBatch entity) {
        FinishingBatchDTO dto = new FinishingBatchDTO();
        dto.setId(entity.getId()); dto.setBatchName(entity.getBatchName()); dto.setPartyName(entity.getPartyName());
        dto.setBatchDate(entity.getBatchDate()); dto.setCreatedAt(entity.getCreatedAt());
        List<FinishingBatchLotDTO> lots = new ArrayList<>();
        for (FinishingBatchLot lot : entity.getLots()) {
            FinishingBatchLotDTO d = new FinishingBatchLotDTO();
            d.setId(lot.getId()); d.setInwardId(lot.getInwardId()); d.setInwardRowId(lot.getInwardRowId());
            d.setUniqueKey(lot.getUniqueKey()); d.setLotNo(lot.getLotNo()); d.setItemName(lot.getItemName());
            d.setShade(lot.getShade()); d.setProcessing(lot.getProcessing()); d.setRolls(lot.getRolls());
            d.setWeight(lot.getWeight()); d.setReceivedWeight(lot.getReceivedWeight()); d.setWastage(lot.getWastage());
            d.setExtraWt(lot.getExtraWt()); d.setPercentage(lot.getPercentage()); d.setRateFND(lot.getRateFND());
            d.setRate(lot.getRate()); d.setAmount(calcAmount(lot.getWeight(), lot.getRate())); d.setDate(lot.getDate());
            d.setChallanNo(lot.getChallanNo()); d.setPartyName(lot.getPartyName()); lots.add(d);
        }
        dto.setLots(lots);
        return dto;
    }

    private FinishingBatchLot toEntity(FinishingBatchLotDTO d) {
        if (d.getInwardId() == null) throw new IllegalArgumentException("Inward ID is required for each lot");
        if (d.getLotNo() == null || d.getLotNo().trim().isEmpty()) throw new IllegalArgumentException("Lot number is required");
        FinishingBatchLot e = new FinishingBatchLot();
        e.setInwardId(d.getInwardId()); e.setInwardRowId(d.getInwardRowId());
        e.setUniqueKey(d.getUniqueKey()); e.setLotNo(d.getLotNo()); e.setItemName(d.getItemName());
        e.setShade(d.getShade()); e.setProcessing(d.getProcessing()); e.setRolls(d.getRolls()); e.setWeight(d.getWeight());
        e.setReceivedWeight(d.getReceivedWeight()); e.setWastage(d.getWastage()); e.setExtraWt(d.getExtraWt());
        e.setPercentage(d.getPercentage()); e.setRateFND(d.getRateFND()); e.setRate(d.getRate());
        e.setAmount(calcAmount(d.getWeight(), d.getRate())); e.setDate(d.getDate()); e.setChallanNo(d.getChallanNo()); e.setPartyName(d.getPartyName());
        return e;
    }

    private String calcAmount(String weight, String rate) {
        try {
            BigDecimal w = new BigDecimal(weight == null || weight.trim().isEmpty() ? "0" : weight.trim());
            BigDecimal r = new BigDecimal(rate == null || rate.trim().isEmpty() ? "0" : rate.trim());
            return w.multiply(r).setScale(2, RoundingMode.HALF_UP).toPlainString();
        } catch (NumberFormatException ex) { return "0.00"; }
    }
}

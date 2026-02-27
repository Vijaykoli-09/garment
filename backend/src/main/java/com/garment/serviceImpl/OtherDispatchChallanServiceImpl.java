package com.garment.serviceImpl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.garment.DTO.OtherDispatchChallanDTO;
import com.garment.DTO.OtherDispatchRowDto;
import com.garment.model.OtherDispatchChallan;
import com.garment.model.OtherDispatchRow;
import com.garment.repository.OtherDispatchChallanRepository;
import com.garment.service.OtherDispatchChallanService;

@Service
@Transactional
public class OtherDispatchChallanServiceImpl implements OtherDispatchChallanService {

    private final OtherDispatchChallanRepository repository;

    public OtherDispatchChallanServiceImpl(OtherDispatchChallanRepository repository) {
        this.repository = repository;
    }

    @Override
    public OtherDispatchChallanDTO create(OtherDispatchChallanDTO dto) {
        if (dto.getDate() == null) {
            dto.setDate(LocalDate.now());
        }

        // Auto-generate challanNo if blank
        if (!StringUtils.hasText(dto.getChallanNo())) {
            String nextNo = generateNextChallanNo(dto.getDate());
            dto.setChallanNo(nextNo);
        }

        // Auto-generate serialNo (optional)
        if (!StringUtils.hasText(dto.getSerialNo())) {
            dto.setSerialNo("OD-" + dto.getChallanNo());
        }

        // If netAmt null & totalAmt present, set netAmt = totalAmt
        if (dto.getTotalAmt() != null && dto.getNetAmt() == null) {
            dto.setNetAmt(dto.getTotalAmt());
        }

        OtherDispatchChallan entity = new OtherDispatchChallan();
        copyDtoToEntity(dto, entity);
        OtherDispatchChallan saved = repository.save(entity);
        return mapToDto(saved);
    }

    @Override
    public OtherDispatchChallanDTO update(Long id, OtherDispatchChallanDTO dto) {
        OtherDispatchChallan existing = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Other Dispatch challan not found: " + id));

        if (!StringUtils.hasText(dto.getChallanNo())) {
            dto.setChallanNo(existing.getChallanNo());
        }
        if (!StringUtils.hasText(dto.getSerialNo())) {
            dto.setSerialNo(existing.getSerialNo());
        }

        copyDtoToEntity(dto, existing);
        OtherDispatchChallan saved = repository.save(existing);
        return mapToDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public OtherDispatchChallanDTO getById(Long id) {
        OtherDispatchChallan entity = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Other Dispatch challan not found: " + id));
        return mapToDto(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OtherDispatchChallanDTO> getAll() {
        return repository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new IllegalArgumentException("Other Dispatch challan not found: " + id);
        }
        repository.deleteById(id);
    }

    // ---------- challanNo auto-generation: YYYY/0001 ----------

    private String generateNextChallanNo(LocalDate date) {
        int year = (date != null ? date.getYear() : LocalDate.now().getYear());
        String prefix = year + "/";          // e.g. "2025/"

        Optional<OtherDispatchChallan> lastOpt =
                repository.findFirstByChallanNoStartingWithOrderByChallanNoDesc(prefix);

        int nextSeq = 1;
        if (lastOpt.isPresent()) {
            String lastNo = lastOpt.get().getChallanNo();
            // Expect "YYYY/0001"
            if (lastNo != null && lastNo.startsWith(prefix)) {
                String[] parts = lastNo.split("/");
                if (parts.length == 2) {
                    try {
                        int lastSeq = Integer.parseInt(parts[1]);
                        if (lastSeq > 0) {
                            nextSeq = lastSeq + 1;
                        }
                    } catch (NumberFormatException ignored) {
                    }
                }
            }
        }

        // 4 digit pad: 0001, 0002, ...
        String seqStr = String.format("%04d", nextSeq);
        return prefix + seqStr;
    }

    // ---------- mapping helpers ----------

    private OtherDispatchChallanDTO mapToDto(OtherDispatchChallan entity) {
        OtherDispatchChallanDTO dto = new OtherDispatchChallanDTO();
        dto.setId(entity.getId());
        dto.setSerialNo(entity.getSerialNo());
        dto.setDate(entity.getDate());
        dto.setChallanNo(entity.getChallanNo());
        dto.setPartyName(entity.getPartyName());
        dto.setBrokerName(entity.getBrokerName());
        dto.setTransportName(entity.getTransportName());
        dto.setDispatchedBy(entity.getDispatchedBy());
        dto.setRemarks1(entity.getRemarks1());
        dto.setRemarks2(entity.getRemarks2());
        dto.setStation(entity.getStation());
        dto.setTotalAmt(entity.getTotalAmt());
        dto.setDiscount(entity.getDiscount());
        dto.setDiscountPercent(entity.getDiscountPercent());
        dto.setTax(entity.getTax());
        dto.setTaxPercent(entity.getTaxPercent());
        dto.setCartage(entity.getCartage());
        dto.setNetAmt(entity.getNetAmt());

        if (entity.getRows() != null) {
            dto.setRows(entity.getRows().stream()
                    .map(this::mapRowToDto)
                    .collect(Collectors.toList()));
        }

        return dto;
    }

    private OtherDispatchRowDto mapRowToDto(OtherDispatchRow row) {
        OtherDispatchRowDto dto = new OtherDispatchRowDto();
        dto.setId(row.getId());
        dto.setMaterialGroupName(row.getMaterialGroupName());
        dto.setMaterialName(row.getMaterialName());
        dto.setUnit(row.getUnit());
        dto.setQty(row.getQty());
        dto.setRate(row.getRate());
        dto.setAmt(row.getAmt());
        return dto;
    }

    private void copyDtoToEntity(OtherDispatchChallanDTO dto, OtherDispatchChallan entity) {
        entity.setSerialNo(dto.getSerialNo());
        entity.setDate(dto.getDate());
        entity.setChallanNo(dto.getChallanNo());
        entity.setPartyName(dto.getPartyName());
        entity.setBrokerName(dto.getBrokerName());
        entity.setTransportName(dto.getTransportName());
        entity.setDispatchedBy(dto.getDispatchedBy());
        entity.setRemarks1(dto.getRemarks1());
        entity.setRemarks2(dto.getRemarks2());
        entity.setStation(dto.getStation());
        entity.setTotalAmt(dto.getTotalAmt());
        entity.setDiscount(dto.getDiscount());
        entity.setDiscountPercent(dto.getDiscountPercent());
        entity.setTax(dto.getTax());
        entity.setTaxPercent(dto.getTaxPercent());
        entity.setCartage(dto.getCartage());
        entity.setNetAmt(dto.getNetAmt());

        // Replace rows
        entity.getRows().clear();
        if (dto.getRows() != null) {
            for (OtherDispatchRowDto rowDto : dto.getRows()) {
                OtherDispatchRow row = new OtherDispatchRow();
                row.setChallan(entity);
                row.setMaterialGroupName(rowDto.getMaterialGroupName());
                row.setMaterialName(rowDto.getMaterialName());
                row.setUnit(rowDto.getUnit());
                row.setQty(rowDto.getQty());
                row.setRate(rowDto.getRate());
                row.setAmt(rowDto.getAmt());
                entity.getRows().add(row);
            }
        }
    }
}
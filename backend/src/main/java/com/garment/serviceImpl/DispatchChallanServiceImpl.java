package com.garment.serviceImpl;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.garment.DTO.DispatchChallanDTO;
import com.garment.DTO.DispatchPackingRowDto;
import com.garment.DTO.DispatchRowDto;
import com.garment.model.DispatchChallan;
import com.garment.model.DispatchPackingRow;
import com.garment.model.DispatchRow;
import com.garment.repository.DispatchChallanRepository;
import com.garment.service.DispatchChallanService;

@Service
@Transactional
public class DispatchChallanServiceImpl implements DispatchChallanService {

    private final DispatchChallanRepository repository;

    public DispatchChallanServiceImpl(DispatchChallanRepository repository) {
        this.repository = repository;
    }

    @Override
    public DispatchChallanDTO create(DispatchChallanDTO dto) {
        DispatchChallan entity = new DispatchChallan();
        copyDtoToEntity(dto, entity);
        DispatchChallan saved = repository.save(entity);
        return mapToDto(saved);
    }

    @Override
    public DispatchChallanDTO update(Long id, DispatchChallanDTO dto) {
        DispatchChallan existing = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Dispatch challan not found: " + id));

        copyDtoToEntity(dto, existing);
        DispatchChallan saved = repository.save(existing);
        return mapToDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public DispatchChallanDTO getById(Long id) {
        DispatchChallan entity = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Dispatch challan not found: " + id));
        return mapToDto(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DispatchChallanDTO> getAll() {
        return repository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new IllegalArgumentException("Dispatch challan not found: " + id);
        }
        repository.deleteById(id);
    }

    // ---------- mapping helpers ----------

    private DispatchChallanDTO mapToDto(DispatchChallan entity) {
        DispatchChallanDTO dto = new DispatchChallanDTO();
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

        if (entity.getPackingRows() != null) {
            dto.setPackingRows(entity.getPackingRows().stream()
                    .map(this::mapPackingRowToDto)
                    .collect(Collectors.toList()));
        }

        return dto;
    }

    private DispatchRowDto mapRowToDto(DispatchRow row) {
        DispatchRowDto dto = new DispatchRowDto();
        dto.setId(row.getId());
        dto.setBarCode(row.getBarCode());
        dto.setBaleNo(row.getBaleNo());
        dto.setArtNo(row.getArtNo());
        dto.setDescription(row.getDescription());
        dto.setLotNumber(row.getLotNumber());
        dto.setSize(row.getSize());
        dto.setShade(row.getShade());
        dto.setBox(row.getBox());
        dto.setPcsPerBox(row.getPcsPerBox());
        dto.setPcs(row.getPcs());
        dto.setRate(row.getRate());
        dto.setAmt(row.getAmt());
        return dto;
    }

    private DispatchPackingRowDto mapPackingRowToDto(DispatchPackingRow pr) {
        DispatchPackingRowDto dto = new DispatchPackingRowDto();
        dto.setId(pr.getId());
        dto.setItemName(pr.getItemName());
        dto.setQuantity(pr.getQuantity());
        return dto;
    }

    private void copyDtoToEntity(DispatchChallanDTO dto, DispatchChallan entity) {
        entity.setSerialNo(dto.getSerialNo());
        entity.setDate(dto.getDate());
        entity.setChallanNo(dto.getChallanNo());
        entity.setPartyName(dto.getPartyName());
        entity.setBrokerName(dto.getBrokerName());
        entity.setTransportName(dto.getTransportName());
        entity.setDispatchedBy(dto.getDispatchedBy());
        entity.setRemarks1(dto.getRemarks1());
        entity.setRemarks2(dto.getRemarks2());
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
            for (DispatchRowDto rowDto : dto.getRows()) {
                DispatchRow row = new DispatchRow();
                row.setChallan(entity);
                row.setBarCode(rowDto.getBarCode());
                row.setBaleNo(rowDto.getBaleNo());
                row.setArtNo(rowDto.getArtNo());
                row.setDescription(rowDto.getDescription());
                row.setLotNumber(rowDto.getLotNumber());
                row.setSize(rowDto.getSize());
                row.setShade(rowDto.getShade());
                row.setBox(rowDto.getBox());
                row.setPcsPerBox(rowDto.getPcsPerBox());
                row.setPcs(rowDto.getPcs());
                row.setRate(rowDto.getRate());
                row.setAmt(rowDto.getAmt());
                entity.getRows().add(row);
            }
        }

        // Replace packing rows
        entity.getPackingRows().clear();
        if (dto.getPackingRows() != null) {
            for (DispatchPackingRowDto prDto : dto.getPackingRows()) {
                DispatchPackingRow pr = new DispatchPackingRow();
                pr.setChallan(entity);
                pr.setItemName(prDto.getItemName());
                pr.setQuantity(prDto.getQuantity());
                entity.getPackingRows().add(pr);
            }
        }
    }

}
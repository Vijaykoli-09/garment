package com.garment.serviceImpl;

import com.garment.DTO.ProductionReceiptDto;
import com.garment.DTO.ProductionReceiptResponseDto;
import com.garment.DTO.ProductionReceiptRowDto;
import com.garment.model.ProductionReceipt;
import com.garment.model.ProductionReceiptRow;
import com.garment.repository.ProductionReceiptRepository;
import com.garment.service.ProductionReceiptService;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class ProductionReceiptServiceImpl implements ProductionReceiptService {

    private final ProductionReceiptRepository receiptRepository;

    public ProductionReceiptServiceImpl(ProductionReceiptRepository receiptRepository) {
        this.receiptRepository = receiptRepository;
    }

    @Override
    public ProductionReceiptResponseDto create(ProductionReceiptDto dto) {
        ProductionReceipt receipt = mapDtoToEntity(dto);
        receipt = receiptRepository.save(receipt);

        // <CHANGE> Removed deductFromCuttingLots - cutting entries remain unchanged

        return mapEntityToResponseDto(receipt);
    }

    @Override
    public List<ProductionReceiptResponseDto> listAll() {
        return receiptRepository.findByDeletedFalseOrderByDatedDesc()
                .stream()
                .map(this::mapEntityToResponseDto)
                .collect(Collectors.toList());
    }

    @Override
    public ProductionReceiptResponseDto update(Long id, ProductionReceiptDto dto) {
        ProductionReceipt existingReceipt = receiptRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Production receipt not found: " + id));

        // <CHANGE> Removed restoreToCuttingLots - no need to restore

        // Update fields
        existingReceipt.setVoucherNo(dto.getVoucherNo());
        existingReceipt.setDated(parseDate(dto.getDated()));
        existingReceipt.setEmployeeName(dto.getEmployeeName());
        existingReceipt.setProcessName(dto.getProcessName());
        existingReceipt.setRandomEntry(dto.getRandomEntry() != null ? dto.getRandomEntry() : false);

        // Clear existing rows and re-add
        existingReceipt.clearRows();

        if (dto.getRows() != null && !dto.getRows().isEmpty()) {
            final ProductionReceipt finalReceipt = existingReceipt;
            dto.getRows().forEach(rowDto -> {
                ProductionReceiptRow row = mapRowDtoToEntity(rowDto);
                finalReceipt.addRow(row);
            });
        }

        ProductionReceipt saved = receiptRepository.save(existingReceipt);

        // <CHANGE> Removed deductFromCuttingLots - cutting entries remain unchanged

        return mapEntityToResponseDto(saved);
    }

    @Override
    public List<ProductionReceiptResponseDto> findByDeletedFalseOrderByDatedDesc() {
        return receiptRepository.findByDeletedFalseOrderByDatedDesc()
                .stream()
                .map(this::mapEntityToResponseDto)
                .collect(Collectors.toList());
    }

    @Override
    public ProductionReceiptResponseDto getById(Long id) {
        ProductionReceipt receipt = receiptRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Production receipt not found: " + id));

        if (Boolean.TRUE.equals(receipt.getDeleted())) {
            throw new RuntimeException("Production receipt not found: " + id);
        }

        return mapEntityToResponseDto(receipt);
    }

    @Override
    public void softDelete(Long id) {
        ProductionReceipt receipt = receiptRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Production receipt not found: " + id));

        // <CHANGE> Removed restoreToCuttingLots - no need to restore

        receipt.setDeleted(true);
        receiptRepository.save(receipt);
    }

    // ===================== Helper Methods =====================

    // <CHANGE> Removed deductFromCuttingLots and restoreToCuttingLots methods
    // Cutting entries now remain unchanged. Frontend calculates remaining pcs.

    private ProductionReceipt mapDtoToEntity(ProductionReceiptDto dto) {
        ProductionReceipt receipt = ProductionReceipt.builder()
                .voucherNo(dto.getVoucherNo())
                .dated(parseDate(dto.getDated()))
                .employeeName(dto.getEmployeeName())
                .processName(dto.getProcessName())
                .randomEntry(dto.getRandomEntry() != null ? dto.getRandomEntry() : false)
                .deleted(false)
                .build();

        if (dto.getRows() != null && !dto.getRows().isEmpty()) {
            dto.getRows().forEach(rowDto -> {
                ProductionReceiptRow row = mapRowDtoToEntity(rowDto);
                receipt.addRow(row);
            });
        }

        return receipt;
    }

    private ProductionReceiptRow mapRowDtoToEntity(ProductionReceiptRowDto rdto) {
        return ProductionReceiptRow.builder()
                .cardNo(rdto.getCardNo())
                .artNo(rdto.getArtNo())
                .size(rdto.getSize())
                .pcs(rdto.getPcs())
                .originalPcs(rdto.getOriginalPcs())
                .weightage(rdto.getWeightage())
                .rate(rdto.getRate())
                .amount(rdto.getAmount())
                .remarks(rdto.getRemarks())
                .build();
    }

    private ProductionReceiptResponseDto mapEntityToResponseDto(ProductionReceipt e) {
        List<ProductionReceiptRowDto> rowDtos = e.getRows().stream()
                .map(r -> ProductionReceiptRowDto.builder()
                        .cardNo(r.getCardNo())
                        .artNo(r.getArtNo())
                        .Size(r.getSize())
                        .pcs(r.getPcs())
                        .originalPcs(r.getOriginalPcs())
                        .weightage(r.getWeightage())
                        .rate(r.getRate())
                        .amount(r.getAmount())
                        .remarks(r.getRemarks())
                        .build())
                .collect(Collectors.toList());

        return ProductionReceiptResponseDto.builder()
                .id(e.getId())
                .voucherNo(e.getVoucherNo())
                .dated(e.getDated() != null ? e.getDated().toString() : null)
                .employeeName(e.getEmployeeName())
                .processName(e.getProcessName())
                .randomEntry(e.getRandomEntry())
                .rows(rowDtos)
                .build();
    }

    private LocalDate parseDate(String dateString) {
        if (!StringUtils.hasText(dateString)) return null;
        return LocalDate.parse(dateString);
    }
}
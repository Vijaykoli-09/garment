package com.garment.service.serviceImpl;



import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.garment.DTO.FinishingStockStatementDTO;
import com.garment.DTO.FinishingStockStatementDataDTO;
import com.garment.model.FinishingStockStatement;
import com.garment.model.FinishingStockStatementData;
import com.garment.repository.FinishingStockStatementRepository;
import com.garment.service.FinishingStockStatementService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class FinishingStockStatementServiceImpl implements FinishingStockStatementService {

    private final FinishingStockStatementRepository statementRepository;

    @Override
    public FinishingStockStatementDTO createStatement(FinishingStockStatementDTO dto) {
        FinishingStockStatement statement = new FinishingStockStatement();
        statement.setPartyName(dto.getPartyName());
        statement.setItemName(dto.getItemName());
        statement.setFromDate(dto.getFromDate());
        statement.setToDated(dto.getToDated());

        if (dto.getRows() != null) {
            dto.getRows().forEach(rowDto -> {
                FinishingStockStatementData data = new FinishingStockStatementData();
                data.setDate(rowDto.getDate());
                data.setNarration(rowDto.getNarration());
                data.setIssuePcs(rowDto.getIssuePcs());
                data.setIssueKgs(rowDto.getIssueKgs());
                data.setReceiptPcs(rowDto.getReceiptPcs());
                data.setReceiptKgs(rowDto.getReceiptKgs());
                data.setReceiptWastage(rowDto.getReceiptWastage());
                data.setReceiptRate(rowDto.getReceiptRate());
                data.setReceiptAmount(rowDto.getReceiptAmount());
                data.setBalancePcs(rowDto.getBalancePcs());
                data.setBalanceKgs(rowDto.getBalanceKgs());
                statement.addRow(data);
            });
        }

        FinishingStockStatement saved = statementRepository.save(statement);
        return mapToDTO(saved);
    }

    @Override
    public List<FinishingStockStatementDTO> getAllStatements() {
        return statementRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public FinishingStockStatementDTO getStatementById(Long id) {
        return statementRepository.findById(id)
                .map(this::mapToDTO)
                .orElseThrow(() -> new RuntimeException("Statement not found with ID: " + id));
    }

    @Override
    public void deleteStatement(Long id) {
        statementRepository.deleteById(id);
    }

    private FinishingStockStatementDTO mapToDTO(FinishingStockStatement entity) {
        FinishingStockStatementDTO dto = new FinishingStockStatementDTO();
        dto.setId(entity.getId());
        dto.setPartyName(entity.getPartyName());
        dto.setItemName(entity.getItemName());
        dto.setFromDate(entity.getFromDate());
        dto.setToDated(entity.getToDated());

        List<FinishingStockStatementDataDTO> rows = entity.getRows().stream().map(row -> {
            FinishingStockStatementDataDTO r = new FinishingStockStatementDataDTO();
            r.setId(row.getId());
            r.setDate(row.getDate());
            r.setNarration(row.getNarration());
            r.setIssuePcs(row.getIssuePcs());
            r.setIssueKgs(row.getIssueKgs());
            r.setReceiptPcs(row.getReceiptPcs());
            r.setReceiptKgs(row.getReceiptKgs());
            r.setReceiptWastage(row.getReceiptWastage());
            r.setReceiptRate(row.getReceiptRate());
            r.setReceiptAmount(row.getReceiptAmount());
            r.setBalancePcs(row.getBalancePcs());
            r.setBalanceKgs(row.getBalanceKgs());
            return r;
        }).collect(Collectors.toList());

        dto.setRows(rows);
        return dto;
    }
}

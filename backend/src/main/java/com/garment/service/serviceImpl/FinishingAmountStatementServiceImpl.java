package com.garment.service.serviceImpl;


import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.garment.DTO.FinishingAmountStatementDTO;
import com.garment.DTO.FinishingAmountStatementDataDTO;
import com.garment.model.FinishingAmountStatement;
import com.garment.model.FinishingAmountStatementData;
import com.garment.repository.FinishingAmountStatementRepository;
import com.garment.repository.FinisAmountStatementDataRepository;
import com.garment.service.FinishingAmountStatementService;

import lombok.RequiredArgsConstructor;

@Service
@Transactional
@RequiredArgsConstructor
public class FinishingAmountStatementServiceImpl implements FinishingAmountStatementService {

    private final FinishingAmountStatementRepository statementRepository;
    private final FinisAmountStatementDataRepository dataRepository;

    // 🔹 Create or Save Statement
    @Override
    public FinishingAmountStatementDTO createStatement(FinishingAmountStatementDTO dto) {
        // Convert DTO to Entity
        FinishingAmountStatement statement = new FinishingAmountStatement();
        statement.setPartyName(dto.getPartyName());
        statement.setFromDate(dto.getFromDate());
        statement.setToDate(dto.getToDate());

        if (dto.getRows() != null) {
            dto.getRows().forEach(rowDto -> {
                FinishingAmountStatementData row = new FinishingAmountStatementData();
                row.setDate(rowDto.getDate());
                row.setNarration(rowDto.getNarration());
                row.setDebit(rowDto.getDebit());
                row.setCredit(rowDto.getCredit());
                row.setBalance(rowDto.getBalance());
                row.setType(rowDto.getType());
                statement.addRow(row);
            });
        }

        // Save main entity (cascades to child)
        FinishingAmountStatement saved = statementRepository.save(statement);

        // Convert back to DTO
        return convertToDTO(saved);
    }

    // 🔹 Get All Statements
    @Override
    public List<FinishingAmountStatementDTO> getAllStatements() {
        return statementRepository.findAll()
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    // 🔹 Get Single Statement by ID
    @Override
    public FinishingAmountStatementDTO getStatementById(Long id) {
        FinishingAmountStatement statement = statementRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Statement not found with ID: " + id));

        return convertToDTO(statement);
    }

    // 🔹 Delete Statement
    @Override
    public void deleteStatement(Long id) {
        if (!statementRepository.existsById(id)) {
            throw new RuntimeException("Statement not found with ID: " + id);
        }
        statementRepository.deleteById(id);
    }

    // 🔹 Utility - Convert Entity to DTO
    private FinishingAmountStatementDTO convertToDTO(FinishingAmountStatement entity) {
        FinishingAmountStatementDTO dto = new FinishingAmountStatementDTO();
        dto.setId(entity.getId());
        dto.setPartyName(entity.getPartyName());
        dto.setFromDate(entity.getFromDate());
        dto.setToDate(entity.getToDate());

        List<FinishingAmountStatementDataDTO> rows = entity.getRows()
                .stream()
                .map(row -> {
                    FinishingAmountStatementDataDTO r = new FinishingAmountStatementDataDTO();
                    r.setId(row.getId());
                    r.setDate(row.getDate());
                    r.setNarration(row.getNarration());
                    r.setDebit(row.getDebit());
                    r.setCredit(row.getCredit());
                    r.setBalance(row.getBalance());
                    r.setType(row.getType());
                    return r;
                })
                .collect(Collectors.toList());

        dto.setRows(rows);
        return dto;
    }
}

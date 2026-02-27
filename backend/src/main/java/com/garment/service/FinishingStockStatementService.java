package com.garment.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.garment.DTO.FinishingStockStatementDTO;

@Service
public interface FinishingStockStatementService {
    FinishingStockStatementDTO createStatement(FinishingStockStatementDTO dto);

    List<FinishingStockStatementDTO> getAllStatements();

    FinishingStockStatementDTO getStatementById(Long id);

    void deleteStatement(Long id);
}

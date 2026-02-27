package com.garment.service;


import java.util.List;

import org.springframework.stereotype.Service;

import com.garment.DTO.FinishingAmountStatementDTO;

@Service
public interface FinishingAmountStatementService {
    FinishingAmountStatementDTO createStatement(FinishingAmountStatementDTO dto);
    List<FinishingAmountStatementDTO> getAllStatements();
    FinishingAmountStatementDTO getStatementById(Long id);
    void deleteStatement(Long id);
}

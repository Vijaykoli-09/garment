package com.garment.service;

import com.garment.DTO.CuttingEntryDTO;
import com.garment.DTO.CuttingEntryListDTO;
import com.garment.DTO.CuttingStockConsumptionDTO;
import org.springframework.data.domain.Page;

import java.time.LocalDate;
import java.util.List;

public interface CuttingEntryService {
    String nextSerial(LocalDate date);
    CuttingEntryDTO create(CuttingEntryDTO dto);
    CuttingEntryDTO update(String serialNo, CuttingEntryDTO dto);
    CuttingEntryDTO get(String serialNo);
    List<CuttingEntryDTO> list();
    Page<CuttingEntryListDTO> listPaged(int page, int size, String search);
    List<CuttingStockConsumptionDTO> stockConsumptionSummary();
    List<String> findDuplicateLotNumbers(String serialNo, List<String> lotNos);
    void delete(String serialNo);
}
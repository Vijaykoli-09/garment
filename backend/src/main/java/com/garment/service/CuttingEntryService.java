package com.garment.service;

import com.garment.DTO.CuttingEntryDTO;

import java.time.LocalDate;
import java.util.List;

public interface CuttingEntryService {
    String nextSerial(LocalDate date);
    CuttingEntryDTO create(CuttingEntryDTO dto);
    CuttingEntryDTO update(String serialNo, CuttingEntryDTO dto);
    CuttingEntryDTO get(String serialNo);
    List<CuttingEntryDTO> list();
    void delete(String serialNo);
}
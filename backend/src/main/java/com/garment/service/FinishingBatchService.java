package com.garment.service;

import com.garment.DTO.FinishingBatchDTO;
import java.util.List;

public interface FinishingBatchService {
    FinishingBatchDTO save(FinishingBatchDTO dto);
    FinishingBatchDTO update(Long id, FinishingBatchDTO dto);
    List<FinishingBatchDTO> findAll();
    FinishingBatchDTO findById(Long id);
    void delete(Long id);
}

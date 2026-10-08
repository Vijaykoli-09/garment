package com.garment.service;

import com.garment.DTO.DyeingBatchDTO;

import java.util.List;

public interface DyeingBatchService {

    DyeingBatchDTO save(DyeingBatchDTO dto);

    DyeingBatchDTO update(Long id, DyeingBatchDTO dto);

    List<DyeingBatchDTO> findAll();

    DyeingBatchDTO findById(Long id);

    void delete(Long id);
}
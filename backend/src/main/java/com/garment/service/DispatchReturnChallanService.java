package com.garment.service;

import java.util.List;

import com.garment.DTO.DispatchReturnChallanRequestDTO;
import com.garment.DTO.DispatchReturnChallanResponseDTO;

public interface DispatchReturnChallanService {

    DispatchReturnChallanResponseDTO create(DispatchReturnChallanRequestDTO dto);

    DispatchReturnChallanResponseDTO update(Long id, DispatchReturnChallanRequestDTO dto);

    DispatchReturnChallanResponseDTO getById(Long id);

    List<DispatchReturnChallanResponseDTO> getAll();

    void delete(Long id);
}
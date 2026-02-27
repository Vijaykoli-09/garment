package com.garment.service;

import java.util.List;

import com.garment.DTO.DispatchChallanDTO;

public interface DispatchChallanService {

    DispatchChallanDTO create(DispatchChallanDTO dto);

    DispatchChallanDTO update(Long id, DispatchChallanDTO dto);

    DispatchChallanDTO getById(Long id);

    List<DispatchChallanDTO> getAll();

    void delete(Long id);
}
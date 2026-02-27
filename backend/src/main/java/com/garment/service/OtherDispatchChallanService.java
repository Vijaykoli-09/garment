package com.garment.service;

import java.util.List;

import com.garment.DTO.OtherDispatchChallanDTO;

public interface OtherDispatchChallanService {

    OtherDispatchChallanDTO create(OtherDispatchChallanDTO dto);

    OtherDispatchChallanDTO update(Long id, OtherDispatchChallanDTO dto);

    OtherDispatchChallanDTO getById(Long id);

    List<OtherDispatchChallanDTO> getAll();

    void delete(Long id);
}
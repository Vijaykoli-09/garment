package com.garment.service;

import com.garment.DTO.MaterialReturnDTO;
import com.garment.model.MaterialReturn;

import java.util.List;
import java.util.Optional;

public interface MaterialReturnService {
    MaterialReturn save(MaterialReturnDTO dto);
    MaterialReturn update(Long id, MaterialReturnDTO dto);
    List<MaterialReturn> findAll();
    Optional<MaterialReturn> findById(Long id);
    void delete(Long id);
}

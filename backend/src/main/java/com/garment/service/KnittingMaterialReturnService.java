package com.garment.service;

import com.garment.DTO.KnittingMaterialReturnDTO;
import com.garment.model.KnittingMaterialReturn;

import java.util.List;

public interface KnittingMaterialReturnService {
    KnittingMaterialReturn save(KnittingMaterialReturnDTO dto);
    KnittingMaterialReturn update(Long id, KnittingMaterialReturnDTO dto);
    KnittingMaterialReturn getById(Long id);
    List<KnittingMaterialReturn> getAll();
    void delete(Long id);
}

package com.garment.service;

import com.garment.DTO.DyeingMaterialReturnDTO;
import com.garment.model.DyeingMaterialReturn;

import java.util.List;
import java.util.Optional;

public interface DyeingMaterialReturnService {
    DyeingMaterialReturn save(DyeingMaterialReturnDTO dto);
    DyeingMaterialReturn update(Long id, DyeingMaterialReturnDTO dto);
    List<DyeingMaterialReturn> findAll();
    Optional<DyeingMaterialReturn> findById(Long id);
    void delete(Long id);
}

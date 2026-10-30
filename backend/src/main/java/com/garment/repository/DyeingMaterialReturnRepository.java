package com.garment.repository;

import com.garment.model.DyeingMaterialReturn;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DyeingMaterialReturnRepository extends JpaRepository<DyeingMaterialReturn, Long> {
}

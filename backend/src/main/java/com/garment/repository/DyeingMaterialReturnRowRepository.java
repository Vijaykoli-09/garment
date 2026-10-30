package com.garment.repository;

import com.garment.model.DyeingMaterialReturnRow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DyeingMaterialReturnRowRepository extends JpaRepository<DyeingMaterialReturnRow, Long> {
}

package com.garment.repository;

import com.garment.model.DyeingInwardRow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DyeingInwardRowRepository extends JpaRepository<DyeingInwardRow, Long> {
}

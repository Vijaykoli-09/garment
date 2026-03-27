package com.garment.repository;

import com.garment.model.MaterialStockAdjustment;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface MaterialStockAdjustmentRepository extends JpaRepository<MaterialStockAdjustment, Long> {
    List<MaterialStockAdjustment> findByAdjDateLessThanEqual(LocalDate toDate, Sort sort);
}
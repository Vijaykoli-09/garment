package com.garment.repository;

import com.garment.model.MaterialStockAdjustment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;

public interface MaterialStockAdjustmentRepository extends JpaRepository<MaterialStockAdjustment, Long> {
    Page<MaterialStockAdjustment> findByAdjDateLessThanEqual(LocalDate toDate, Pageable pageable);
}
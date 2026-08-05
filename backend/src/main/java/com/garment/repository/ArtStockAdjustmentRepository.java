package com.garment.repository;

import com.garment.model.ArtStockAdjustment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;

public interface ArtStockAdjustmentRepository extends JpaRepository<ArtStockAdjustment, Long> {
    Page<ArtStockAdjustment> findByAdjDateLessThanEqual(LocalDate toDate, Pageable pageable);
}
package com.garment.repository;

import com.garment.model.ArtStockAdjustment;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface ArtStockAdjustmentRepository extends JpaRepository<ArtStockAdjustment, Long> {
    List<ArtStockAdjustment> findByAdjDateLessThanEqual(LocalDate toDate, Sort sort);
}
package com.garment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.garment.model.FinishingInwardRow;

import java.util.List;

@Repository
public interface FinishingInwardRowRepository extends JpaRepository<FinishingInwardRow, Long> {
    List<FinishingInwardRow> findByFinishingInwardId(Long finishingInwardId);
}
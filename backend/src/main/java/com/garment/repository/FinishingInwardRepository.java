package com.garment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.garment.model.FinishingInward;

@Repository
public interface FinishingInwardRepository extends JpaRepository<FinishingInward, Long> {
    // Optional: find by challan no
    FinishingInward findByChallanNo(String challanNo);
}
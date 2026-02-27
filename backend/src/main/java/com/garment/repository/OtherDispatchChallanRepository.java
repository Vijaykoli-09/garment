package com.garment.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.garment.model.OtherDispatchChallan;

public interface OtherDispatchChallanRepository extends JpaRepository<OtherDispatchChallan, Long> {

    // Find last challan of given year "YYYY/...."
    Optional<OtherDispatchChallan> findFirstByChallanNoStartingWithOrderByChallanNoDesc(String prefix);
}
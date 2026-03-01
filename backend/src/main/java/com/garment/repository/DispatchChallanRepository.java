package com.garment.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.garment.model.DispatchChallan;

public interface DispatchChallanRepository extends JpaRepository<DispatchChallan, Long> {

    // Saal ke hisaab se challans nikalne ke liye
    List<DispatchChallan> findByDateBetween(LocalDate start, LocalDate end);
}
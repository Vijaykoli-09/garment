package com.garment.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.garment.model.DispatchReturnChallan;

public interface DispatchReturnChallanRepository extends JpaRepository<DispatchReturnChallan, Long> {




    List<DispatchReturnChallan> findByDateBetween(LocalDate start, LocalDate end);
}
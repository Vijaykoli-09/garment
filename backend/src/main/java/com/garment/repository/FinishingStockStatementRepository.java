package com.garment.repository;


import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.garment.model.FinishingStockStatement;

@Repository
public interface FinishingStockStatementRepository extends JpaRepository<FinishingStockStatement, Long> {
}

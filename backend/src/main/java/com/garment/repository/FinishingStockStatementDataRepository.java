package com.garment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.garment.model.FinishingStockStatementData;

@Repository
public interface FinishingStockStatementDataRepository extends JpaRepository<FinishingStockStatementData, Long> {
}

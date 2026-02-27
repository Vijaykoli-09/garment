package com.garment.repository;

import com.garment.model.ProductionReceiptRow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductionReceiptRowRepository extends JpaRepository<ProductionReceiptRow, Long> {
}

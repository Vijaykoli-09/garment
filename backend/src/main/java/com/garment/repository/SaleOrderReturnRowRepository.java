package com.garment.repository;

import com.garment.model.SaleOrderReturnRow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SaleOrderReturnRowRepository extends JpaRepository<SaleOrderReturnRow, Long> {
}

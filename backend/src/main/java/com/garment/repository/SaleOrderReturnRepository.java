package com.garment.repository;

import com.garment.model.SaleOrderReturn;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface SaleOrderReturnRepository extends JpaRepository<SaleOrderReturn, Long> {

    @Query("SELECT COALESCE(MAX(CAST(SUBSTRING(r.returnNo, 5) AS int)), 0) + 1 FROM SaleOrderReturn r WHERE r.returnNo LIKE 'SOR-%'")
    Integer getNextSerialNumber();
}
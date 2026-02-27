package com.garment.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.garment.model.SaleOrderRow;

public interface SaleOrderRowRepository extends JpaRepository<SaleOrderRow, Long> {
}
package com.garment.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.garment.model.MaterialPurchaseEntry;

public interface MaterialPurchaseRepository extends JpaRepository<MaterialPurchaseEntry, Long> {
}
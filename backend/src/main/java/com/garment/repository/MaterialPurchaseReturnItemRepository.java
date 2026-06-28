package com.garment.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.garment.model.MaterialPurchaseReturnItem;

public interface MaterialPurchaseReturnItemRepository extends JpaRepository<MaterialPurchaseReturnItem, Long> {
}
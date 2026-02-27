package com.garment.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.garment.model.PurchaseReturnItem;

public interface PurchaseReturnItemRepository extends JpaRepository<PurchaseReturnItem, Long> {
}

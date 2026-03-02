package com.garment.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.garment.model.PurchaseOrder;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long>{

    // Current year ke prefix (YYYY/) se start hone wale last order ko id desc se fetch karega
    PurchaseOrder findTopByOrderNoStartingWithOrderByIdDesc(String orderNoPrefix);
}
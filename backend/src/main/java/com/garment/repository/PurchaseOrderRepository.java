package com.garment.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.garment.model.PurchaseOrder;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long>{

}

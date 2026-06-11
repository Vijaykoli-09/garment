package com.garment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.garment.model.MaterialPurchaseOrder;

public interface MaterialPurchaseOrderRepository extends JpaRepository<MaterialPurchaseOrder, Long> {

    @Query("select max(o.orderSeq) from MaterialPurchaseOrder o where o.orderYear = :year")
    Integer findMaxSeqForYear(@Param("year") int year);
}
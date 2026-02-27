package com.garment.repository;

import com.garment.model.ProductionReceipt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductionReceiptRepository extends JpaRepository<ProductionReceipt, Long> {
    // exclude soft-deleted
    List<ProductionReceipt> findByDeletedFalseOrderByDatedDesc();
}

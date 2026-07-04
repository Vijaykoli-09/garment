package com.garment.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.garment.model.MaterialPurchaseReturn;

public interface MaterialPurchaseReturnRepository extends JpaRepository<MaterialPurchaseReturn, Long> {

    @Query("""
        SELECT DISTINCT pr
        FROM MaterialPurchaseReturn pr
        LEFT JOIN FETCH pr.items i
        LEFT JOIN FETCH i.material
        LEFT JOIN FETCH i.shade
        LEFT JOIN FETCH pr.party
    """)
    List<MaterialPurchaseReturn> findAllWithItems();
}
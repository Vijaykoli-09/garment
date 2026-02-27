package com.garment.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.garment.model.MaterialStock;

@Repository
public interface MaterialStockRepository extends JpaRepository<MaterialStock, Long> {

    Optional<MaterialStock> findByMaterial_IdAndShade_ShadeCode(Long materialId, String shadeCode);

    @Query(value = """
    SELECT ms.*
    FROM material_stock ms
    JOIN material m ON m.id = ms.material_id
    WHERE m.material_group_id IN (:groupIds)
      AND ms.material_id IN (:itemIds)
      AND ms.transaction_date >= :fromDate
      AND ms.transaction_date < :toDateExcl
""", nativeQuery = true)
    List<MaterialStock> findByGroupItemAndDateRange(
            @Param("groupIds") List<Long> groupIds,
            @Param("itemIds")  List<Long> itemIds,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDateExcl") LocalDate toDateExcl
    );





    // ✅ Aggregated Stock Report (Sum values across date range)
    @Query("""
    	    SELECT 
    	        ms.material.id AS materialId,
    	        ms.shade.shadeCode AS shadeCode,
    	        MIN(ms.openingStock) AS openingStock,
    	        SUM(ms.purchase) AS totalPurchase,
    	        SUM(ms.consumed) AS totalConsumed,
    	        (MIN(ms.openingStock) + SUM(ms.purchase) - SUM(ms.consumed)) AS closingBalance
    	    FROM MaterialStock ms
    	    WHERE ms.material.id IN :itemIds
    	      AND ms.material.materialGroup.id IN :groupIds
    	      AND (:fromDate IS NULL OR ms.transactionDate >= :fromDate)
    	      AND (:toDate IS NULL OR ms.transactionDate <= :toDate)
    	    GROUP BY ms.material.id, ms.shade.shadeCode
    	""")
    	List<Object[]> getAggregatedStockReport(
    	        @Param("groupIds") List<Long> groupIds,
    	        @Param("itemIds") List<Long> itemIds,
    	        @Param("fromDate") LocalDate fromDate,
    	        @Param("toDate") LocalDate toDate
    	);




}




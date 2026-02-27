package com.garment.repository;

import java.util.List;


import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;


import com.garment.model.PurchaseOrderItem;

public interface PurchaseOrderItemRepository extends JpaRepository<PurchaseOrderItem, Long> {

	@Query("SELECT poi FROM PurchaseOrderItem poi " +
		       "LEFT JOIN FETCH poi.item " + // now Material
		       "LEFT JOIN FETCH poi.shade " +
		       "JOIN poi.purchaseOrder po " +
		       "WHERE po.party.id = :partyId")
		List<PurchaseOrderItem> findItemsByPartyId(@Param("partyId") Long partyId);

//	//For Pending Orders logic
//	@Query("""
//		    SELECT new com.garment.DTO.PurchasePendingOrdersDTO(
//		        po.id,
//		        po.orderNo,
//		        po.date,
//		        po.party.partyName,
//		        m.materialName,
//		        sh.shadeCode,
//		        CAST(poi.quantity AS double),
//		        COALESCE(SUM(pe.wtPerBox), 0),
//		        CAST(poi.quantity AS double) - COALESCE(SUM(pe.wtPerBox), 0)
//		    )
//		    FROM PurchaseOrderItem poi
//		    JOIN poi.purchaseOrder po
//		    JOIN poi.item m
//		    LEFT JOIN poi.shade sh
//		    LEFT JOIN PurchaseEntryItem pe 
//		           ON pe.orderNo = po.orderNo 
//		          AND pe.material.id = m.id 
//		          AND (sh IS NULL OR pe.shade.shadeCode = sh.shadeCode)
//		    GROUP BY po.id, po.orderNo, po.date, po.party.partyName,
//		             m.materialName, sh.shadeCode, poi.quantity
//		    HAVING (CAST(poi.quantity AS double) - COALESCE(SUM(pe.wtPerBox), 0)) > 0
//		""")
//		List<PurchasePendingOrdersDTO> getPendingOrders();




}



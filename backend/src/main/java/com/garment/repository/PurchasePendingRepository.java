package com.garment.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.garment.model.PurchaseOrderItem;

public interface PurchasePendingRepository extends JpaRepository<PurchaseOrderItem, Long>{
	
	interface PendingRowProjection {
	    Long getId();
	    String getOrderNo();
	    LocalDate getOrderDate();
	    String getPartyName();
	    String getItemName();
	    Double getOrderReceived();
	    Double getOrderDelivered();
	    Double getOrderPending();
	  }

	@Query(value = """
			  SELECT
			    MIN(poi.id)                                                    AS id,
			    po.order_no                                                    AS orderNo,
			    po.date                                                        AS orderDate,
			    p.party_name                                                   AS partyName,
			    m.material_name                                                AS itemName,
			    CAST(SUM(poi.quantity) AS double precision)                    AS orderReceived,
			    CAST(COALESCE(SUM(pei.wt_per_box), 0) AS double precision)     AS orderDelivered,
			    CAST(SUM(poi.quantity) - COALESCE(SUM(pei.wt_per_box), 0)
			         AS double precision)                                      AS orderPending
			  FROM purchase_order_item poi
			  JOIN purchase_order po  ON po.id = poi.purchase_order_id
			  JOIN party p            ON p.id  = po.party_id
			  JOIN material m         ON m.id  = poi.material_id
			  LEFT JOIN purchase_entry_item pei
			       ON pei.order_no    = po.order_no
			      AND pei.material_id = poi.material_id
			      AND (poi.shade_code IS NULL OR pei.shade_code = poi.shade_code)
			  LEFT JOIN purchase_entry pe ON pe.id = pei.purchase_entry_id
			  WHERE po.date <= :asOn
			    AND ( :partyIdsEmpty = true OR po.party_id IN (:partyIds) )
			    AND ( :itemIdsEmpty  = true OR poi.material_id IN (:itemIds) )
			  GROUP BY po.order_no, po.date, p.party_name, m.material_name
			  HAVING (SUM(poi.quantity) - COALESCE(SUM(pei.wt_per_box), 0)) > 0
			  ORDER BY po.date, po.order_no
			  """, nativeQuery = true)
			List<PendingRowProjection> findPendingReport(
			    @Param("asOn") LocalDate asOn,
			    @Param("partyIds") List<Long> partyIds,
			    @Param("partyIdsEmpty") boolean partyIdsEmpty,
			    @Param("itemIds") List<Long> itemIds,
			    @Param("itemIdsEmpty") boolean itemIdsEmpty
			);



	  // Distinct parties having POs (for the left list)
	@Query(value = """
		    SELECT DISTINCT p.id, p.party_name
		    FROM purchase_order po
		    JOIN party p ON p.id = po.party_id
		    WHERE LOWER(p.category) = 'purchase'
		    ORDER BY p.party_name
		    """, nativeQuery = true)
		List<Object[]> distinctPartiesFromPO();


	  // Distinct materials (items) present in PO items (for the right list)
	  @Query(value = """
	      SELECT DISTINCT m.id, m.material_name
	      FROM purchase_order_item poi
	      JOIN material m ON m.id = poi.material_id
	      ORDER BY m.material_name
	      """, nativeQuery = true)
	  List<Object[]> distinctItemsFromPO();
}

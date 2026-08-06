//package com.garment.repository;
//
//import java.time.LocalDate;
//import java.util.List;
//
//import org.springframework.data.jpa.repository.Query;
//import org.springframework.data.repository.Repository;
//import org.springframework.data.repository.query.Param;
//
//public interface MaterialPurchasePendingRepository extends Repository<Object, Long> {
//
//    // Used for item filter list
//    // CHANGE table/column names as per your DB
//    @Query(value = """
//        SELECT i.id, i.item_name
//        FROM item i
//        ORDER BY i.item_name
//        """, nativeQuery = true)
//    List<Object[]> listMaterials();
//
//    // Pending report WITHOUT item filter
//    // CHANGE table/column names as per your DB
//    @Query(value = """
//        SELECT
//            poi.id                                 AS row_id,
//            po.order_no                            AS order_no,
//            po.order_date                          AS order_date,
//            p.party_name                           AS party_name,
//            i.item_name                            AS item_name,
//            COALESCE(poi.qty, 0)                   AS order_received,
//            COALESCE(SUM(pd.delivered_qty), 0)     AS order_delivered,
//            (COALESCE(poi.qty, 0) - COALESCE(SUM(pd.delivered_qty), 0)) AS order_pending
//        FROM purchase_order po
//        JOIN party p ON p.id = po.party_id
//        JOIN purchase_order_item poi ON poi.purchase_order_id = po.id
//        JOIN item i ON i.id = poi.item_id
//        LEFT JOIN purchase_delivery pd
//               ON pd.purchase_order_item_id = poi.id
//              AND pd.delivery_date <= :asOnDate
//        WHERE po.order_date <= :asOnDate
//          AND po.party_id IN (:partyIds)
//        GROUP BY poi.id, po.order_no, po.order_date, p.party_name, i.item_name, poi.qty
//        HAVING (COALESCE(poi.qty, 0) - COALESCE(SUM(pd.delivered_qty), 0)) > 0
//        ORDER BY po.order_date, po.order_no
//        """, nativeQuery = true)
//    List<Object[]> pendingAllItems(
//            @Param("asOnDate") LocalDate asOnDate,
//            @Param("partyIds") List<Long> partyIds
//    );
//
//    // Pending report WITH item filter
//    // CHANGE table/column names as per your DB
//    @Query(value = """
//        SELECT
//            poi.id                                 AS row_id,
//            po.order_no                            AS order_no,
//            po.order_date                          AS order_date,
//            p.party_name                           AS party_name,
//            i.item_name                            AS item_name,
//            COALESCE(poi.qty, 0)                   AS order_received,
//            COALESCE(SUM(pd.delivered_qty), 0)     AS order_delivered,
//            (COALESCE(poi.qty, 0) - COALESCE(SUM(pd.delivered_qty), 0)) AS order_pending
//        FROM purchase_order po
//        JOIN party p ON p.id = po.party_id
//        JOIN purchase_order_item poi ON poi.purchase_order_id = po.id
//        JOIN item i ON i.id = poi.item_id
//        LEFT JOIN purchase_delivery pd
//               ON pd.purchase_order_item_id = poi.id
//              AND pd.delivery_date <= :asOnDate
//        WHERE po.order_date <= :asOnDate
//          AND po.party_id IN (:partyIds)
//          AND poi.item_id IN (:itemIds)
//        GROUP BY poi.id, po.order_no, po.order_date, p.party_name, i.item_name, poi.qty
//        HAVING (COALESCE(poi.qty, 0) - COALESCE(SUM(pd.delivered_qty), 0)) > 0
//        ORDER BY po.order_date, po.order_no
//        """, nativeQuery = true)
//    List<Object[]> pendingWithItems(
//            @Param("asOnDate") LocalDate asOnDate,
//            @Param("partyIds") List<Long> partyIds,
//            @Param("itemIds") List<Long> itemIds
//    );
//}
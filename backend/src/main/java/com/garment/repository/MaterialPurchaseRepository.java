package com.garment.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.garment.model.MaterialPurchaseEntry;

public interface MaterialPurchaseRepository extends JpaRepository<MaterialPurchaseEntry, Long> {
    @Query(value = """
            select e.id as "id",
                   e.challan_no as "challanNo",
                   cast(e.date as text) as "date",
                   p.party_name as "partyName",
                   coalesce(summary.material_names, '') as "materialNames",
                   coalesce(summary.total_quantity, 0) as "totalQuantity",
                   coalesce(summary.total_amount, 0) as "totalAmount"
            from purchase_entries e
            left join party p on p.id = e.party_id
            left join lateral (
                select string_agg(coalesce(i.material_name, '-'), ', ' order by i.id) as material_names,
                       sum(i.wt_per_box) as total_quantity,
                       sum(i.amount) as total_amount
                from purchase_entry_items i
                where i.entry_id = e.id
            ) summary on true
            where lower(coalesce(e.challan_no, '')) like :q
               or lower(coalesce(p.party_name, '')) like :q
               or lower(coalesce(cast(e.date as text), '')) like :q
            order by e.id asc
            """,
            countQuery = """
            select count(*)
            from purchase_entries e
            left join party p on p.id = e.party_id
            where lower(coalesce(e.challan_no, '')) like :q
               or lower(coalesce(p.party_name, '')) like :q
               or lower(coalesce(cast(e.date as text), '')) like :q
            """,
            nativeQuery = true)
    Page<MaterialPurchaseEntryListProjection> searchPaged(
            @Param("q") String query, Pageable pageable);

    interface MaterialPurchaseEntryListProjection {
        Long getId();
        String getChallanNo();
        String getDate();
        String getPartyName();
        String getMaterialNames();
        java.math.BigDecimal getTotalQuantity();
        java.math.BigDecimal getTotalAmount();
    }
}
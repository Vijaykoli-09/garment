package com.garment.repository;

import com.garment.model.PurchaseEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PurchaseEntryRepository extends JpaRepository<PurchaseEntry, Long> {

    @Override
    @EntityGraph(attributePaths = {"items"})
    List<PurchaseEntry> findAll();

    @Override
    @EntityGraph(attributePaths = {"items"})
    Optional<PurchaseEntry> findById(Long id);

    @Query(value = """
            select e.id as "id",
                   e.challan_no as "challanNo",
                   cast(e.date as text) as "date",
                   p.party_name as "partyName",
                   coalesce(summary.yarn_names, '') as "yarnNames",
                   coalesce(summary.material_names, '') as "materialNames",
                   coalesce(summary.total_wt_per_box, 0) as "totalWtPerBox",
                   coalesce(summary.total_amount, 0) as "totalAmount"
            from purchase_entry e
            left join party p on p.id = e.party_id
            left join lateral (
                select string_agg(coalesce(r.yarn_name, '-'), ', ' order by r.id) as yarn_names,
                       string_agg(coalesce(m.material_name, '-'), ', ' order by r.id) as material_names,
                       sum(r.wt_per_box) as total_wt_per_box,
                       sum(r.amount) as total_amount
                from purchase_entry_item r
                left join material m on m.id = r.material_id
                where r.purchase_entry_id = e.id
            ) summary on true
            where lower(coalesce(e.challan_no, '')) like :q
               or lower(coalesce(p.party_name, '')) like :q
               or lower(coalesce(cast(e.date as text), '')) like :q
            order by e.id desc
            """,
            countQuery = """
            select count(*)
            from purchase_entry e
            left join party p on p.id = e.party_id
            where lower(coalesce(e.challan_no, '')) like :q
               or lower(coalesce(p.party_name, '')) like :q
               or lower(coalesce(cast(e.date as text), '')) like :q
            """,
            nativeQuery = true)
    Page<PurchaseEntryListProjection> searchPaged(@Param("q") String query, Pageable pageable);

    interface PurchaseEntryListProjection {
        Long getId();
        String getChallanNo();
        String getDate();
        String getPartyName();
        String getYarnNames();
        String getMaterialNames();
        Long getTotalWtPerBox();
        Double getTotalAmount();
    }
}
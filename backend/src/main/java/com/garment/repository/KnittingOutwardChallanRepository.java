package com.garment.repository;

import com.garment.model.KnittingOutwardChallan;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface KnittingOutwardChallanRepository extends JpaRepository<KnittingOutwardChallan, Long> {
    List<KnittingOutwardChallan> findByParty_Id(Long partyId);

    @Query(value = """
            select c.id as "id",
                   c.challan_no as "challanNo",
                   c.date as "date",
                   p.party_name as "partyName",
                   coalesce(summary.yarn_names, '') as "yarnNames",
                   coalesce(summary.material_names, '') as "materialNames",
                   coalesce(summary.total_wt_per_box, 0) as "totalWtPerBox",
                   coalesce(summary.total_amount, 0) as "totalAmount"
            from knitting_outward c
            left join party p on p.id = c.party_id
            left join lateral (
                select string_agg(distinct r.yarn_name, ', ' order by r.yarn_name) as yarn_names,
                       string_agg(distinct m.material_name, ', ' order by m.material_name) as material_names,
                       sum(r.wt_per_box) as total_wt_per_box,
                       sum(r.amount) as total_amount
                from knitting_outward_row r
                left join material m on m.id = r.material_id
                where r.knitting_outward_id = c.id
            ) summary on true
            where lower(coalesce(c.challan_no, '')) like :q
               or lower(coalesce(p.party_name, '')) like :q
               or lower(coalesce(cast(c.date as text), '')) like :q
            order by c.id asc
            """,
            countQuery = """
            select count(*)
            from knitting_outward c
            left join party p on p.id = c.party_id
            where lower(coalesce(c.challan_no, '')) like :q
               or lower(coalesce(p.party_name, '')) like :q
               or lower(coalesce(cast(c.date as text), '')) like :q
            """,
            nativeQuery = true)
    Page<KnittingOutwardChallanListProjection> searchPaged(
            @Param("q") String query, Pageable pageable);

    @Query(value = """
            select coalesce(max(cast(split_part(c.challan_no, '/', 2) as integer)), 0)
            from knitting_outward c
            where c.challan_no like concat(:prefix, '%')
              and split_part(c.challan_no, '/', 2) ~ '^[0-9]{1,9}$'
            """, nativeQuery = true)
    Integer findMaxChallanNumberForPrefix(@Param("prefix") String prefix);

    interface KnittingOutwardChallanListProjection {
        Long getId();
        String getChallanNo();
        java.time.LocalDate getDate();
        String getPartyName();
        String getYarnNames();
        String getMaterialNames();
        Long getTotalWtPerBox();
        Double getTotalAmount();
    }
}

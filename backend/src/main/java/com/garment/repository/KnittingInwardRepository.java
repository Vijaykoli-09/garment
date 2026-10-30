package com.garment.repository;

import com.garment.model.KnittingInward;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface KnittingInwardRepository extends JpaRepository<KnittingInward, Long> {
    Optional<KnittingInward> findByChallanNo(String challanNo);

    @Query(value = """
            select k.id as "id",
                   k.challan_no as "challanNo",
                   k.dated as "dated",
                   p.party_name as "partyName",
                   k.total_rolls as "totalRolls",
                   k.total_amount as "totalAmount"
            from knitting_inward k
            left join party p on p.id = k.party_id
            where lower(coalesce(k.challan_no, '')) like :q
               or lower(coalesce(p.party_name, '')) like :q
            order by k.dated desc nulls last, k.id desc
            """,
            countQuery = """
            select count(*)
            from knitting_inward k
            left join party p on p.id = k.party_id
            where lower(coalesce(k.challan_no, '')) like :q
               or lower(coalesce(p.party_name, '')) like :q
            """,
            nativeQuery = true)
    Page<KnittingInwardListProjection> searchPaged(@Param("q") String query, Pageable pageable);

    interface KnittingInwardListProjection {
        Long getId();
        String getChallanNo();
        java.time.LocalDate getDated();
        String getPartyName();
        Integer getTotalRolls();
        Double getTotalAmount();
    }
}

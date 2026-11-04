package com.garment.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.garment.model.SaleOrder;

public interface SaleOrderRepository extends JpaRepository<SaleOrder, Long> {
    Optional<SaleOrder> findByOrderNo(String orderNo);

    @Query(value = "select s from SaleOrder s "
            + "left join Party p on p.id = s.partyId "
            + "left join p.agent a "
            + "where lower(s.orderNo) like :q "
            + "or lower(s.partyName) like :q "
            + "or lower(coalesce(p.station, '')) like :q "
            + "or lower(coalesce(a.agentName, '')) like :q",
            countQuery = "select count(s) from SaleOrder s "
                    + "left join Party p on p.id = s.partyId "
                    + "left join p.agent a "
                    + "where lower(s.orderNo) like :q "
                    + "or lower(s.partyName) like :q "
                    + "or lower(coalesce(p.station, '')) like :q "
                    + "or lower(coalesce(a.agentName, '')) like :q")
    Page<SaleOrder> searchPaged(@Param("q") String query, Pageable pageable);

    @Query("select s.orderNo from SaleOrder s where s.orderNo like concat(:prefix, '%')")
    List<String> findOrderNosByPrefix(String prefix);

    // For pendency
    List<SaleOrder> findByDatedBefore(LocalDate fromDate);
    List<SaleOrder> findByDatedBetween(LocalDate fromDate, LocalDate toDate);

    // ── NEW: for broker "party orders" screen ─────────────────────────
    List<SaleOrder> findByPartyIdOrderByDatedDesc(Long partyId);
    List<SaleOrder> findByPartyNameIgnoreCaseOrderByDatedDesc(String partyName);
    List<SaleOrder> findByPartyIdAndDatedBetweenOrderByDatedDesc(Long partyId, LocalDate fromDate, LocalDate toDate);

    /** Distinct party + date + art number rows (slim index for the Pendency screen's art filter). */
    @Query("""
            select distinct so.partyId as partyId, so.dated as dated, r.artNo as artNo
            from SaleOrder so join so.rows r
            where r.artNo is not null and trim(r.artNo) <> ''
            """)
    List<SaleOrderArtRow> findArtIndexRows();

    interface SaleOrderArtRow {
        Long getPartyId();
        LocalDate getDated();
        String getArtNo();
    }
}
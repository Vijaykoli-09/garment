// OrderSettleRepository.java
package com.garment.repository;

import com.garment.model.OrderSettle;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

import com.garment.DTO.OrderSettleListDTO;
import com.garment.DTO.OrderSettlePendencySummaryDTO;

public interface OrderSettleRepository extends JpaRepository<OrderSettle, Long> {

    List<OrderSettle> findByDatedBetween(LocalDate from, LocalDate to);

    @Query(value = """
            select new com.garment.DTO.OrderSettleListDTO(
                settle.id, settle.challanNo, settle.dated, settle.partyId, settle.partyName
            )
            from OrderSettle settle
            where lower(coalesce(settle.challanNo, '')) like :q
               or lower(coalesce(settle.partyName, '')) like :q
            """,
            countQuery = """
            select count(settle)
            from OrderSettle settle
            where lower(coalesce(settle.challanNo, '')) like :q
               or lower(coalesce(settle.partyName, '')) like :q
            """)
    Page<OrderSettleListDTO> searchPaged(@Param("q") String query, Pageable pageable);

    @Query("""
            select new com.garment.DTO.OrderSettlePendencySummaryDTO(
                settle.partyName, settleRow.artNo, sizeDetail.sizeName, sum(sizeDetail.settleBox)
            )
            from OrderSettle settle
            join settle.rows settleRow
            join settleRow.sizeDetails sizeDetail
            where settle.partyId = :partyId
              and settle.dated between :fromDate and :toDate
              and upper(settleRow.artNo) in :artNos
            group by settle.partyName, settleRow.artNo, sizeDetail.sizeName
            """)
    List<OrderSettlePendencySummaryDTO> findPendencySummary(
            @Param("partyId") Long partyId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("artNos") List<String> artNos);

    /**
     * Settled boxes per Party + Art + Shade + Size between two dates, summed in SQL.
     * Used by Sale Order Pendency so no OrderSettle graph / DTOs are built.
     */
    @Query(value = """
            select s.party_name as "partyName",
                   r.art_no as "artNo",
                   r.shade_name as "shade",
                   d.size_name as "sizeName",
                   coalesce(sum(coalesce(d.settle_box, 0)), 0) as "settleBox"
            from order_settles s
            join order_settle_rows r on r.settle_id = s.id
            join order_settle_size_details d on d.row_id = r.id
            where s.dated between :fromDate and :toDate
            group by s.party_name, r.art_no, r.shade_name, d.size_name
            """, nativeQuery = true)
    List<SettlePendencyProjection> findPendencyTotals(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    interface SettlePendencyProjection {
        String getPartyName();
        String getArtNo();
        String getShade();
        String getSizeName();
        Long getSettleBox();
    }
}
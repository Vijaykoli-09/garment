package com.garment.repository;

import com.garment.model.ProductionReceipt;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductionReceiptRepository extends JpaRepository<ProductionReceipt, Long> {
    // exclude soft-deleted
    List<ProductionReceipt> findByDeletedFalseOrderByDatedDesc();

    @Query(value = """
            select receipt.id as "id",
                   receipt.voucher_no as "voucherNo",
                   receipt.dated as "dated",
                   receipt.employee_name as "employeeName",
                   receipt.process_name as "processName",
                   coalesce(summary.lot_art_pairs, '') as "lotArtPairs",
                   coalesce(summary.total_pcs, 0) as "totalPcs"
            from production_receipt receipt
            left join lateral (
                select (
                           select string_agg(pairs.pair_text, E'\\n' order by pairs.first_row_id)
                           from (
                               select concat_ws(
                                          E'\\t',
                                          coalesce(nullif(trim(receipt_row.card_no), ''), '-'),
                                          coalesce(nullif(trim(receipt_row.art_no), ''), '-')
                                      ) as pair_text,
                                      min(receipt_row.id) as first_row_id
                               from production_receipt_row receipt_row
                               where receipt_row.receipt_id = receipt.id
                                 and (
                                     coalesce(trim(receipt_row.card_no), '') <> ''
                                     or coalesce(trim(receipt_row.art_no), '') <> ''
                                 )
                               group by nullif(trim(receipt_row.card_no), ''),
                                        nullif(trim(receipt_row.art_no), '')
                           ) pairs
                       ) as lot_art_pairs,
                       coalesce((
                           select sum(
                               nullif(substring(trim(receipt_row.pcs) from '^(-?[0-9]+([.][0-9]+)?)'), '')::numeric
                           )
                           from production_receipt_row receipt_row
                           where receipt_row.receipt_id = receipt.id
                       ), 0) as total_pcs
            ) summary on true
            where receipt.deleted = false
              and (
                  lower(coalesce(receipt.employee_name, '')) like :q
                  or exists (
                      select 1
                      from production_receipt_row receipt_row
                      where receipt_row.receipt_id = receipt.id
                        and (
                            lower(coalesce(receipt_row.card_no, '')) like :q
                            or lower(coalesce(receipt_row.art_no, '')) like :q
                        )
                  )
              )
            order by receipt.dated desc nulls last, receipt.id desc
            """,
            countQuery = """
            select count(*)
            from production_receipt receipt
            where receipt.deleted = false
              and (
                  lower(coalesce(receipt.employee_name, '')) like :q
                  or exists (
                      select 1
                      from production_receipt_row receipt_row
                      where receipt_row.receipt_id = receipt.id
                        and (
                            lower(coalesce(receipt_row.card_no, '')) like :q
                            or lower(coalesce(receipt_row.art_no, '')) like :q
                        )
                  )
              )
            """,
            nativeQuery = true)
    Page<ProductionReceiptListProjection> searchPaged(@Param("q") String query, Pageable pageable);

    @Query(value = """
            select receipt_row.card_no as "cardNo",
                   receipt_row.art_no as "artNo",
                   coalesce(sum(
                       nullif(substring(trim(receipt_row.pcs) from '^(-?[0-9]+([.][0-9]+)?)'), '')::numeric
                   ), 0) as "consumedPcs"
            from production_receipt_row receipt_row
            join production_receipt receipt on receipt.id = receipt_row.receipt_id
            where receipt.deleted = false
              and lower(receipt.process_name) = lower(:processName)
              and (
                  cast(:excludeReceiptId as bigint) is null
                  or receipt.id <> cast(:excludeReceiptId as bigint)
              )
            group by receipt_row.card_no, receipt_row.art_no
            """,
            nativeQuery = true)
    List<ConsumptionProjection> findConsumptionByProcess(
            @Param("processName") String processName,
            @Param("excludeReceiptId") Long excludeReceiptId);

    interface ProductionReceiptListProjection {
        Long getId();
        String getVoucherNo();
        java.time.LocalDate getDated();
        String getEmployeeName();
        String getProcessName();
        String getLotArtPairs();
        java.math.BigDecimal getTotalPcs();
    }

    interface ConsumptionProjection {
        String getCardNo();
        String getArtNo();
        java.math.BigDecimal getConsumedPcs();
    }
}

package com.garment.repository;

import com.garment.model.CuttingEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CuttingEntryRepository extends JpaRepository<CuttingEntry, String> {
    boolean existsBySerialNo(String serialNo);

    @Query(value = """
            select c.serial_no as "serialNo",
                   c.dated as "date",
                   c.employee_name as "employeeName",
                   c.issue_to as "issueTo",
                   c.issue_branch_name as "issueBranchName",
                   c.total_pcs as "totalPcs",
                   c.total_consumption as "totalConsumption",
                   c.total_kho as "totalKho",
                   c.total_cons_amount as "totalConsAmount",
                   coalesce(lots.lot_nos, '') as "lotNos"
            from cutting_entries c
            left join lateral (
                select string_agg(r.cut_lot_no, ', ' order by r.sno, r.id) as lot_nos
                from cutting_lot_rows r
                where r.cutting_entry_serial_no = c.serial_no
            ) lots on true
            where lower(coalesce(c.serial_no, '')) like :q
               or lower(coalesce(c.employee_name, '')) like :q
               or lower(coalesce(cast(c.dated as text), '')) like :q
               or lower(coalesce(c.issue_to, '')) like :q
               or lower(coalesce(c.issue_branch_name, '')) like :q
               or exists (
                    select 1 from cutting_lot_rows r
                    where r.cutting_entry_serial_no = c.serial_no
                      and lower(coalesce(r.cut_lot_no, '')) like :q
               )
            order by c.serial_no asc
            """,
            countQuery = """
            select count(*)
            from cutting_entries c
            where lower(coalesce(c.serial_no, '')) like :q
               or lower(coalesce(c.employee_name, '')) like :q
               or lower(coalesce(cast(c.dated as text), '')) like :q
               or lower(coalesce(c.issue_to, '')) like :q
               or lower(coalesce(c.issue_branch_name, '')) like :q
               or exists (
                    select 1 from cutting_lot_rows r
                    where r.cutting_entry_serial_no = c.serial_no
                      and lower(coalesce(r.cut_lot_no, '')) like :q
               )
            """,
            nativeQuery = true)
    Page<CuttingEntryListProjection> searchPaged(@Param("q") String query, Pageable pageable);

    @Query(value = """
            select item_name as "itemName",
                   shade as "shade",
                   coalesce(sum(
                       case
                           when trim(consumption) ~ '^-?([0-9]+([.][0-9]*)?|[.][0-9]+)$'
                           then trim(consumption)::numeric
                           else 0
                       end
                   ), 0) as "consumption"
            from cutting_stock_rows
            group by item_name, shade
            """, nativeQuery = true)
    List<CuttingStockConsumptionProjection> findStockConsumptionSummary();

    @Query("""
            select distinct upper(r.cutLotNo)
            from CuttingLotRow r
            where upper(r.cutLotNo) in :lotNos
              and (:excludeSerialNo is null or r.cuttingEntry.serialNo <> :excludeSerialNo)
            """)
    List<String> findExistingCutLotNumbers(
            @Param("lotNos") List<String> lotNos,
            @Param("excludeSerialNo") String excludeSerialNo);

    @Query("select c.serialNo from CuttingEntry c where c.serialNo like ?1%")
    List<String> findSerialsByPrefix(String prefix);

    interface CuttingEntryListProjection {
        String getSerialNo();
        java.time.LocalDate getDate();
        String getEmployeeName();
        String getIssueTo();
        String getIssueBranchName();
        String getTotalPcs();
        String getTotalConsumption();
        String getTotalKho();
        String getTotalConsAmount();
        String getLotNos();
    }

    interface CuttingStockConsumptionProjection {
        String getItemName();
        String getShade();
        java.math.BigDecimal getConsumption();
    }
}
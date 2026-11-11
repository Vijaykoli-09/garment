package com.garment.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Collection;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.garment.DTO.PackingChallanListDTO;
import com.garment.model.PackingChallan;
import com.garment.model.PackingChallanRow;

public interface PackingChallanRepository extends JpaRepository<PackingChallan, String> {
    @Query(value = """
            select new com.garment.DTO.PackingChallanListDTO(
                challan.serialNo, challan.date, challan.partyName,
                challan.totalBox, challan.totalPcs, challan.totalAmount
            )
            from PackingChallan challan
            where lower(challan.serialNo) like :q
               or lower(coalesce(challan.partyName, '')) like :q
               or lower(function('to_char', challan.date, 'YYYY-MM-DD')) like :q
               or lower(function('to_char', challan.date, 'DD/MM/YY')) like :q
               or exists (
                    select packingRow.id from PackingChallanRow packingRow
                    where packingRow.challan = challan
                      and (
                          lower(coalesce(packingRow.cuttingLotNo, '')) like :q
                          or lower(coalesce(packingRow.artNo, '')) like :q
                          or lower(coalesce(packingRow.artGroupName, '')) like :q
                          or lower(coalesce(packingRow.workOnArt, '')) like :q
                          or lower(coalesce(packingRow.shade.shadeName, '')) like :q
                          or str(packingRow.boxCount) like :q
                          or str(packingRow.pcs) like :q
                          or str(packingRow.rate) like :q
                          or str(packingRow.amount) like :q
                          or exists (
                              select detail.id from PackingChallanSizeDetail detail
                              where detail.row = packingRow
                                and (
                                    lower(coalesce(detail.sizeName, '')) like :q
                                    or str(detail.boxCount) like :q
                                    or str(detail.perBox) like :q
                                    or str(detail.pcs) like :q
                                    or str(detail.rate) like :q
                                    or str(detail.amount) like :q
                                )
                          )
                      )
               )
            """,
            countQuery = """
            select count(challan)
            from PackingChallan challan
            where lower(challan.serialNo) like :q
               or lower(coalesce(challan.partyName, '')) like :q
               or lower(function('to_char', challan.date, 'YYYY-MM-DD')) like :q
               or lower(function('to_char', challan.date, 'DD/MM/YY')) like :q
               or exists (
                    select packingRow.id from PackingChallanRow packingRow
                    where packingRow.challan = challan
                      and (
                          lower(coalesce(packingRow.cuttingLotNo, '')) like :q
                          or lower(coalesce(packingRow.artNo, '')) like :q
                          or lower(coalesce(packingRow.artGroupName, '')) like :q
                          or lower(coalesce(packingRow.workOnArt, '')) like :q
                          or lower(coalesce(packingRow.shade.shadeName, '')) like :q
                          or str(packingRow.boxCount) like :q
                          or str(packingRow.pcs) like :q
                          or str(packingRow.rate) like :q
                          or str(packingRow.amount) like :q
                          or exists (
                              select detail.id from PackingChallanSizeDetail detail
                              where detail.row = packingRow
                                and (
                                    lower(coalesce(detail.sizeName, '')) like :q
                                    or str(detail.boxCount) like :q
                                    or str(detail.perBox) like :q
                                    or str(detail.pcs) like :q
                                    or str(detail.rate) like :q
                                    or str(detail.amount) like :q
                                )
                          )
                      )
               )
            """)
    Page<PackingChallanListDTO> searchPaged(@Param("q") String query, Pageable pageable);

    /**
     * Aggregated summaries for only the current View List page.
     * Includes art numbers, cutting lots and size names.
     */
    @Query(value = """
            select r.challan_serial_no as "serialNo",
                   string_agg(distinct nullif(trim(r.art_no), ''), ', ' order by nullif(trim(r.art_no), '')) as "artNumbers",
                   string_agg(distinct nullif(trim(r.cut_lot_no), ''), ', ' order by nullif(trim(r.cut_lot_no), '')) as "cuttingLotNumbers",
                   string_agg(distinct nullif(trim(d.size_name), ''), ', ' order by nullif(trim(d.size_name), '')) as "sizeNames"
            from packing_challan_rows r
            left join packing_challan_size_details d on d.row_id = r.id
            where r.challan_serial_no in (:serialNos)
            group by r.challan_serial_no
            """, nativeQuery = true)
    List<PackingRowSummaryProjection> findRowSummariesBySerialNos(
            @Param("serialNos") Collection<String> serialNos);

    interface PackingRowSummaryProjection {
        String getSerialNo();
        String getArtNumbers();
        String getCuttingLotNumbers();
        String getSizeNames();
    }

    /**
     * Loads the packing rows of the requested page together with their Shade,
     * through the SAME entity mapping (PackingChallanRow.shade) that the Edit
     * screen uses (see PackingChallanServiceImpl.toDTO). One query per page.
     */
    @Query("""
            select r from PackingChallanRow r
            left join fetch r.shade
            where r.challan.serialNo in :serialNos
            order by r.challan.serialNo, r.sno, r.id
            """)
    List<PackingChallanRow> findRowsWithShadeBySerialNos(
            @Param("serialNos") Collection<String> serialNos);

    /**
     * Fetch complete size-wise values only for the challans in the requested page.
     * Keeps pagination efficient while returning the same details shown in the old list.
     */
    @Query(value = """
            select r.challan_serial_no as "serialNo",
                   d.size_name as "sizeName",
                   d.box_count as "boxCount",
                   d.per_box as "perBox",
                   d.pcs as "pcs",
                   d.rate as "rate",
                   d.amount as "amount",
                   d.id as "detailId"
            from packing_challan_rows r
            join packing_challan_size_details d on d.row_id = r.id
            where r.challan_serial_no in (:serialNos)
            order by r.challan_serial_no, r.sno, d.id
            """, nativeQuery = true)
    List<PackingListSizeDetailProjection> findListSizeDetailsBySerialNos(
            @Param("serialNos") Collection<String> serialNos);

    interface PackingListSizeDetailProjection {
        String getSerialNo();
        String getSizeName();
        Integer getBoxCount();
        Integer getPerBox();
        Integer getPcs();
        java.math.BigDecimal getRate();
        java.math.BigDecimal getAmount();
        Long getDetailId();
    }

    @Query(value = """
            select packing_row.cut_lot_no as "cuttingLotNo",
                   detail.size_name as "sizeName",
                   coalesce(sum(detail.box_count), 0) as "boxCount"
            from packing_challans challan
            join packing_challan_rows packing_row on packing_row.challan_serial_no = challan.serial_no
            join packing_challan_size_details detail on detail.row_id = packing_row.id
            where cast(:excludeSerial as varchar) is null
               or challan.serial_no <> cast(:excludeSerial as varchar)
            group by packing_row.cut_lot_no, detail.size_name
            """, nativeQuery = true)
    List<PackedSizeProjection> findPackedSizeTotals(@Param("excludeSerial") String excludeSerial);


    @Query(value = """
            select distinct on (packing_row.art_no, detail.size_name)
                   packing_row.art_no as "artNo",
                   detail.size_name as "sizeName",
                   detail.rate as "rate",
                   detail.per_box as "perBox"
            from packing_challans challan
            join packing_challan_rows packing_row on packing_row.challan_serial_no = challan.serial_no
            join packing_challan_size_details detail on detail.row_id = packing_row.id
            where packing_row.art_no is not null
              and detail.size_name is not null
            order by packing_row.art_no, detail.size_name,
                     challan.dated desc nulls last, challan.serial_no desc, detail.id desc
            """, nativeQuery = true)
    List<PackingRateProjection> findLatestRateSummaries();

    /**
     * Packed stock grouped by Art + Size + Shade across ALL packing challans, computed in SQL.
     * Replaces downloading every challan (with rows and size details) just to add them up.
     * Same rules the Dispatch screen used on the full list: size name comes from the size master
     * when linked, pcs falls back to box * perBox, perBox and rate = latest positive value.
     */
    @Query(value = """
            select (array_agg(trim(r.art_no)
                        order by c.dated desc nulls last, c.serial_no desc, d.id desc))[1] as "artNo",
                   coalesce((array_agg(trim(r.work_on_art)
                        order by c.dated desc nulls last, c.serial_no desc, d.id desc)
                        filter (where nullif(trim(r.work_on_art), '') is not null))[1], '') as "description",
                   (array_agg(trim(case when d.size_id is not null then sz.size_name else d.size_name end)
                        order by c.dated desc nulls last, c.serial_no desc, d.id desc))[1] as "size",
                   coalesce((array_agg(trim(sh.shade_name)
                        order by c.dated desc nulls last, c.serial_no desc, d.id desc)
                        filter (where nullif(trim(sh.shade_name), '') is not null))[1], '') as "shade",
                   coalesce(sum(coalesce(d.box_count, 0)), 0) as "box",
                   coalesce(sum(coalesce(d.pcs, coalesce(d.box_count, 0) * coalesce(d.per_box, 0))), 0) as "pcs",
                   coalesce((array_agg(d.per_box
                        order by c.dated desc nulls last, c.serial_no desc, d.id desc)
                        filter (where d.per_box > 0))[1], 0) as "perBox",
                   (array_agg(d.rate
                        order by c.dated desc nulls last, c.serial_no desc, d.id desc)
                        filter (where d.rate > 0))[1] as "rate"
            from packing_challan_size_details d
            join packing_challan_rows r on r.id = d.row_id
            join packing_challans c on c.serial_no = r.challan_serial_no
            left join sizes sz on sz.id = d.size_id
            left join shades sh on sh.shade_code = r.shade_code
            where nullif(trim(r.art_no), '') is not null
              and nullif(trim(case when d.size_id is not null then sz.size_name else d.size_name end), '') is not null
            group by upper(trim(r.art_no)),
                     upper(trim(case when d.size_id is not null then sz.size_name else d.size_name end)),
                     upper(trim(coalesce(sh.shade_name, '')))
            """, nativeQuery = true)
    List<PackingStockProjection> findPackingStockSummary();

    interface PackingStockProjection {
        String getArtNo();
        String getDescription();
        String getSize();
        String getShade();
        Long getBox();
        Long getPcs();
        Integer getPerBox();
        java.math.BigDecimal getRate();
    }

    @Query("select p.serialNo from PackingChallan p where p.serialNo like concat(:prefix, '%')")
    List<String> findSerialsByPrefix(@Param("prefix") String prefix);
    boolean existsBySerialNo(String serialNo);
    List<PackingChallan> findByDateBetween(LocalDate from, LocalDate to);

    interface PackedSizeProjection {
        String getCuttingLotNo();
        String getSizeName();
        Integer getBoxCount();
    }

    interface PackingRateProjection {
        String getArtNo();
        String getSizeName();
        java.math.BigDecimal getRate();
        Integer getPerBox();
    }
}
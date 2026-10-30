package com.garment.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.garment.DTO.PackingChallanListDTO;
import com.garment.model.PackingChallan;

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
            select distinct on (row.art_no, detail.size_name)
                   packing_row.art_no as "artNo",
                   detail.size_name as "sizeName",
                   detail.rate as "rate",
                   detail.per_box as "perBox"
            from packing_challans challan
            join packing_challan_rows packing_row on packing_row.challan_serial_no = challan.serial_no
            join packing_challan_size_details detail on detail.row_id = row.id
            where packing_row.art_no is not null
              and detail.size_name is not null
            order by packing_row.art_no, detail.size_name,
                     challan.dated desc nulls last, challan.serial_no desc, detail.id desc
            """, nativeQuery = true)
    List<PackingRateProjection> findLatestRateSummaries();

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

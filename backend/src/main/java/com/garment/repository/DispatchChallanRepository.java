package com.garment.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.garment.model.DispatchChallan;

public interface DispatchChallanRepository extends JpaRepository<DispatchChallan, Long> {

    @Query(value = """
            select d.id as "id",
                   d.serial_no as "serialNo",
                   d.date as "date",
                   d.challan_no as "challanNo",
                   d.party_name as "partyName",
                   d.station as "station",
                   d.net_amt as "netAmt",
                   coalesce(art_list.art_nos, '') as "artNos",
                   first_row.art_no as "artNo",
                   first_row.size as "size",
                   first_row.shade as "shade",
                   first_row.box as "box",
                   first_row.pcs_per_box as "pcsPerBox",
                   first_row.pcs as "pcs",
                   first_row.rate as "rate",
                   first_row.amt as "amt"
            from dispatch_challan d
            left join lateral (
                select string_agg(distinct r.art_no, ', ') as art_nos
                from dispatch_challan_row r
                where r.challan_id = d.id
            ) art_list on true
            left join lateral (
                select r.art_no, r.size, r.shade, r.box, r.pcs_per_box, r.pcs, r.rate, r.amt
                from dispatch_challan_row r
                where r.challan_id = d.id
                order by r.id
                limit 1
            ) first_row on true
            where lower(coalesce(d.challan_no, '')) like :q
               or lower(coalesce(cast(d.date as text), '')) like :q
               or lower(coalesce(to_char(d.date, 'DD/MM/YY'), '')) like :q
               or lower(coalesce(d.party_name, '')) like :q
               or lower(coalesce(d.station, '')) like :q
               or lower(coalesce(d.remarks1, '')) like :q
               or lower(coalesce(art_list.art_nos, '')) like :q
               or lower(coalesce(first_row.art_no, '')) like :q
               or lower(coalesce(first_row.size, '')) like :q
               or lower(coalesce(first_row.shade, '')) like :q
               or lower(coalesce(cast(first_row.box as text), '')) like :q
               or lower(coalesce(cast(first_row.pcs_per_box as text), '')) like :q
               or lower(coalesce(cast(first_row.pcs as text), '')) like :q
               or lower(coalesce(cast(first_row.rate as text), '')) like :q
               or lower(coalesce(cast(first_row.amt as text), '')) like :q
               or lower(coalesce(cast(d.net_amt as text), '')) like :q
            order by d.date desc nulls last, d.id desc
            """,
            countQuery = """
            select count(*)
            from dispatch_challan d
            where lower(coalesce(d.challan_no, '')) like :q
               or lower(coalesce(cast(d.date as text), '')) like :q
               or lower(coalesce(to_char(d.date, 'DD/MM/YY'), '')) like :q
               or lower(coalesce(d.party_name, '')) like :q
               or lower(coalesce(d.station, '')) like :q
               or lower(coalesce(d.remarks1, '')) like :q
               or exists (
                    select 1 from dispatch_challan_row r
                    where r.challan_id = d.id
                      and lower(coalesce(r.art_no, '')) like :q
               )
               or exists (
                    select 1 from dispatch_challan_row r
                    where r.challan_id = d.id
                      and r.id = (
                          select min(first_row.id)
                          from dispatch_challan_row first_row
                          where first_row.challan_id = d.id
                      )
                      and (
                          lower(coalesce(r.art_no, '')) like :q
                          or lower(coalesce(r.size, '')) like :q
                          or lower(coalesce(r.shade, '')) like :q
                          or lower(coalesce(cast(r.box as text), '')) like :q
                          or lower(coalesce(cast(r.pcs_per_box as text), '')) like :q
                          or lower(coalesce(cast(r.pcs as text), '')) like :q
                          or lower(coalesce(cast(r.rate as text), '')) like :q
                          or lower(coalesce(cast(r.amt as text), '')) like :q
                      )
               )
               or lower(coalesce(cast(d.net_amt as text), '')) like :q
            """,
            nativeQuery = true)
    Page<DispatchChallanListProjection> searchPaged(@Param("q") String query, Pageable pageable);


    /**
     * Lightweight stock summary for Dispatch rows.
     * Returns one record per Art + Size + Shade instead of loading every
     * DispatchChallan entity and its lazy child collections.
     */
    @Query(value = """
            select
                coalesce(trim(r.art_no), '') as "artNo",
                coalesce(max(r.description), '') as "description",
                coalesce(trim(r.size), '') as "size",
                coalesce(trim(r.shade), '') as "shade",
                coalesce(sum(coalesce(r.box, 0)), 0)::integer as "box",
                coalesce(max(coalesce(r.pcs_per_box, 0)), 0)::integer as "pcsPerBox",
                coalesce(sum(coalesce(r.pcs, 0)), 0)::integer as "pcs"
            from dispatch_challan_row r
            where coalesce(trim(r.art_no), '') <> ''
              and coalesce(trim(r.size), '') <> ''
            group by upper(trim(r.art_no)), upper(trim(r.size)), upper(trim(r.shade)),
                     trim(r.art_no), trim(r.size), trim(r.shade)
            """, nativeQuery = true)
    List<DispatchStockSummaryProjection> findDispatchStockSummary();

    interface DispatchStockSummaryProjection {
        String getArtNo();
        String getDescription();
        String getSize();
        String getShade();
        Integer getBox();
        Integer getPcsPerBox();
        Integer getPcs();
    }


    List<DispatchChallan> findByDateBetween(LocalDate start, LocalDate end);

    interface DispatchChallanListProjection {
        Long getId();
        String getSerialNo();
        LocalDate getDate();
        String getChallanNo();
        String getPartyName();
        String getStation();
        java.math.BigDecimal getNetAmt();
        String getArtNos();
        String getArtNo();
        String getSize();
        String getShade();
        Integer getBox();
        Integer getPcsPerBox();
        Integer getPcs();
        java.math.BigDecimal getRate();
        java.math.BigDecimal getAmt();
    }
}
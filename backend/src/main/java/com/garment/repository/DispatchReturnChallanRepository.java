package com.garment.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.garment.model.DispatchReturnChallan;

public interface DispatchReturnChallanRepository extends JpaRepository<DispatchReturnChallan, Long> {




    List<DispatchReturnChallan> findByDateBetween(LocalDate start, LocalDate end);

    /**
     * Returned stock grouped by Art + Size + Shade up to a date, summed in SQL.
     * Same rule the Dispatch screen applied on the full list: absolute box / pcs per row,
     * pcs falls back to box * pcsPerBox. Replaces downloading every return challan + rows.
     */
    @Query(value = """
            select coalesce(trim(r.art_no), '') as "artNo",
                   coalesce(max(r.description), '') as "description",
                   coalesce(trim(r.size), '') as "size",
                   coalesce(trim(r.shade), '') as "shade",
                   coalesce(sum(abs(coalesce(r.box, 0))), 0)::integer as "box",
                   coalesce(max(coalesce(r.pcs_per_box, 0)), 0)::integer as "pcsPerBox",
                   coalesce(sum(abs(coalesce(r.pcs, coalesce(r.box, 0) * coalesce(r.pcs_per_box, 0)))), 0)::integer as "pcs"
            from dispatch_return_challan c
            join dispatch_return_challan_row r on r.challan_id = c.id
            where c.date <= :toDate
              and coalesce(trim(r.art_no), '') <> ''
              and coalesce(trim(r.size), '') <> ''
            group by upper(trim(r.art_no)), upper(trim(r.size)), upper(trim(r.shade)),
                     trim(r.art_no), trim(r.size), trim(r.shade)
            """, nativeQuery = true)
    List<DispatchReturnStockProjection> findReturnStockSummary(@Param("toDate") LocalDate toDate);

    interface DispatchReturnStockProjection {
        String getArtNo();
        String getDescription();
        String getSize();
        String getShade();
        Integer getBox();
        Integer getPcsPerBox();
        Integer getPcs();
    }
}
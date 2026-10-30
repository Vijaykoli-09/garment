package com.garment.repository;

import com.garment.model.DyeingOutward;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DyeingOutwardRepository extends JpaRepository<DyeingOutward, Long> {

    @Override
    @EntityGraph(attributePaths = {"rows"})
    List<DyeingOutward> findAll();

    @Override
    @EntityGraph(attributePaths = {"rows"})
    Optional<DyeingOutward> findById(Long id);

    @Query(value = """
            select d.id as "id",
                   d.challan_no as "challanNo",
                   d.dated as "dated",
                   d.party_name as "partyName"
            from dyeing_outward d
            where lower(coalesce(d.challan_no, '')) like :q
               or lower(coalesce(d.party_name, '')) like :q
            order by d.dated desc nulls last, d.id desc
            """,
            countQuery = """
            select count(*)
            from dyeing_outward d
            where lower(coalesce(d.challan_no, '')) like :q
               or lower(coalesce(d.party_name, '')) like :q
            """,
            nativeQuery = true)
    Page<DyeingOutwardListProjection> searchPaged(@Param("q") String query, Pageable pageable);

    @Query(value = """
            select distinct r.source_key
            from dyeing_outward_row r
            where r.source_key is not null
              and trim(r.source_key) <> ''
              and (:excludeId is null or r.dyeing_outward_id <> :excludeId)
            """, nativeQuery = true)
    List<String> findIssuedSourceKeys(@Param("excludeId") Long excludeId);

    @Query(value = """
            select distinct upper(r.lot_no)
            from dyeing_outward_row r
            where upper(r.lot_no) in (:lotNos)
              and r.lot_no is not null
            """, nativeQuery = true)
    List<String> findPreviouslyIssuedLots(@Param("lotNos") List<String> lotNos);

    @Query(value = "select challan_no from dyeing_outward order by id desc limit 1", nativeQuery = true)
    Optional<String> findLatestChallanNo();

    interface DyeingOutwardListProjection {
        Long getId();
        String getChallanNo();
        String getDated();
        String getPartyName();
    }
}
package com.garment.repository;

import com.garment.model.KnittingOutwardChallanRow;

import jakarta.transaction.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface KnittingOutwardChallanRowRepository extends JpaRepository<KnittingOutwardChallanRow, Long> {

	@Query("SELECT r.material.id AS materialId, r.shade.shadeCode AS shadeCode, SUM(r.weight) AS consumed " +
		       "FROM KnittingOutwardChallanRow r " +
		       "WHERE r.knittingOutwardChallan.date BETWEEN :fromDate AND :toDate " +
		       "GROUP BY r.material.id, r.shade.shadeCode")
		List<Map<String, Object>> getConsumedMaterial(@Param("fromDate") LocalDate fromDate,
		                                              @Param("toDate") LocalDate toDate);


    @Modifying
    @Transactional
    @Query("DELETE FROM KnittingOutwardChallanRow r WHERE r.knittingOutwardChallan.id = :challanId")
    void deleteByKnittingOutwardChallanId(@Param("challanId") Long challanId);
}


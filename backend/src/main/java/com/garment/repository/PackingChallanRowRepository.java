package com.garment.repository;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.garment.model.PackingChallanRow;

public interface PackingChallanRowRepository extends JpaRepository<PackingChallanRow, Long>{
	@Query("select r.rate from PackingChallanRow r where r.workOnArt = :woa and r.rate is not null order by r.id desc")
	  List<BigDecimal> findRecentRatesForWorkOnArt(@Param("woa") String workOnArt);
}

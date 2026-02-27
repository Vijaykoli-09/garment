package com.garment.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.garment.model.PackingChallan;

public interface PackingChallanRepository extends JpaRepository<PackingChallan, String> {
	@Query("select p.serialNo from PackingChallan p where p.serialNo like concat(:prefix, '%')")
	  List<String> findSerialsByPrefix(@Param("prefix") String prefix);
	  boolean existsBySerialNo(String serialNo);
	List<PackingChallan> findByDateBetween(LocalDate from, LocalDate to);
}

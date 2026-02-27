package com.garment.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.garment.model.CuttingLotRow;

public interface CuttingLotRowRepository  extends JpaRepository<CuttingLotRow, Long>{
	@Query("select distinct r.cutLotNo from CuttingLotRow r order by r.cutLotNo")
	  List<String> listCuttingLots();

	  List<CuttingLotRow> findByCutLotNoOrderBySnoAsc(String cutLotNo);
}

package com.garment.repository;

import com.garment.model.KnittingOutwardChallan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface KnittingOutwardChallanRepository extends JpaRepository<KnittingOutwardChallan, Long> {
    List<KnittingOutwardChallan> findByParty_Id(Long partyId);
}

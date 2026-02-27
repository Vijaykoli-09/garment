package com.garment.repository;



import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.garment.model.FinishingAmountStatementData;


@Repository
public interface FinisAmountStatementDataRepository extends JpaRepository<FinishingAmountStatementData, Long> {
}

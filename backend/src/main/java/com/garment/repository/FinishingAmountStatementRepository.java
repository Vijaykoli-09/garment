package com.garment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.garment.model.FinishingAmountStatement;


@Repository
public interface FinishingAmountStatementRepository extends JpaRepository<FinishingAmountStatement, Long> {
}

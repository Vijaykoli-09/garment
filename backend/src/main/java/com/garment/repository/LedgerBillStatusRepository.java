// src/main/java/com/garment/repository/LedgerBillStatusRepository.java
package com.garment.repository;

import com.garment.model.LedgerBillStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LedgerBillStatusRepository extends JpaRepository<LedgerBillStatus, Long> {

    Optional<LedgerBillStatus> findByDocKey(String docKey);

    List<LedgerBillStatus> findByDocKeyIn(List<String> docKeys);
}
package com.garment.repository;

import com.garment.model.FinishingBatch;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FinishingBatchRepository extends JpaRepository<FinishingBatch, Long> {
    boolean existsByPartyNameIgnoreCaseAndBatchNameIgnoreCase(String partyName, String batchName);
    boolean existsByPartyNameIgnoreCaseAndBatchNameIgnoreCaseAndIdNot(String partyName, String batchName, Long id);
    List<FinishingBatch> findAllByOrderByBatchDateDescCreatedAtDesc();
}

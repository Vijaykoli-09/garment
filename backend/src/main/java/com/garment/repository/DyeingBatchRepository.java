package com.garment.repository;

import com.garment.model.DyeingBatch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DyeingBatchRepository
        extends JpaRepository<DyeingBatch, Long> {

    boolean existsByPartyNameIgnoreCaseAndBatchNameIgnoreCase(
            String partyName,
            String batchName
    );

    boolean existsByPartyNameIgnoreCaseAndBatchNameIgnoreCaseAndIdNot(
            String partyName,
            String batchName,
            Long id
    );

    List<DyeingBatch> findAllByOrderByCreatedAtDesc();
}
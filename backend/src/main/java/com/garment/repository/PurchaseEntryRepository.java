package com.garment.repository;

import com.garment.model.PurchaseEntry;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PurchaseEntryRepository extends JpaRepository<PurchaseEntry, Long> {

    @Override
    @EntityGraph(attributePaths = {"items"})
    List<PurchaseEntry> findAll();

    @Override
    @EntityGraph(attributePaths = {"items"})
    Optional<PurchaseEntry> findById(Long id);
}
package com.garment.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.garment.model.PurchaseEntry;

public interface PurchaseEntryRepository extends JpaRepository<PurchaseEntry, Long> {

}

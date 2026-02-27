package com.garment.repository;

import com.garment.model.CuttingEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface CuttingEntryRepository extends JpaRepository<CuttingEntry, String> {
    boolean existsBySerialNo(String serialNo);

    @Query("select c.serialNo from CuttingEntry c where c.serialNo like ?1%")
    List<String> findSerialsByPrefix(String prefix);
}
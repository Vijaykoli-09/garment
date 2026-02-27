package com.garment.repository;


import com.garment.model.Location;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface LocationRepository extends JpaRepository<Location, Long> {

    @Query("select l.serialNumber from Location l where lower(l.serialNumber) like lower(concat(:prefix, '%'))")
    List<String> findSerialsByPrefix(@Param("prefix") String prefix);

    @Query("select l from Location l " +
            "where lower(l.serialNumber) like lower(concat('%', :q, '%')) " +
            "or lower(l.branchName) like lower(concat('%', :q, '%')) " +
            "or lower(l.branchCode) like lower(concat('%', :q, '%')) " +
            "or lower(l.station) like lower(concat('%', :q, '%')) " +
            "or lower(l.stateName) like lower(concat('%', :q, '%'))")
    List<Location> search(@Param("q") String q);
}
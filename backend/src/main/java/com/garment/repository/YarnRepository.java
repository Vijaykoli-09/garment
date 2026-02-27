package com.garment.repository;

import com.garment.model.Yarn;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface YarnRepository extends JpaRepository<Yarn, String> {
    // serialNo is the primary key (String)
}

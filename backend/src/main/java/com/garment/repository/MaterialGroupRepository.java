package com.garment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.garment.model.MaterialGroup;

@Repository
public interface MaterialGroupRepository extends JpaRepository<MaterialGroup, Long> {

}

package com.garment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.garment.model.CustomerGrade;

@Repository
public interface CustomerGradeRepository extends JpaRepository<CustomerGrade, String> {

}

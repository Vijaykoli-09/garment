package com.garment.repository;

import com.garment.model.JobInwardChallanRow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface JobInwardChallanRowRepository extends JpaRepository<JobInwardChallanRow, Long> {

}

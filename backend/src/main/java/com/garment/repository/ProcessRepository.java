package com.garment.repository;

import com.garment.model.Process;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProcessRepository extends JpaRepository<Process, String> {

    //Process findProcessBySerialNo(String serialNo);

    Process findBySerialNo(String processName);
}

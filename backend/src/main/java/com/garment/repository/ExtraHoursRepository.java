package com.garment.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.garment.model.ExtraHours;

public interface ExtraHoursRepository extends JpaRepository<ExtraHours, Long> {

    Optional<ExtraHours> findByEmployee_CodeAndDate(String employeeCode, LocalDate date);

    List<ExtraHours> findByDateBetween(LocalDate from, LocalDate to);

    List<ExtraHours> findByEmployee_CodeAndDateBetween(String employeeCode, LocalDate from, LocalDate to);

    List<ExtraHours> findByEmployee_Process_SerialNoAndDateBetween(String processSerialNo, LocalDate from, LocalDate to);

    List<ExtraHours> findByEmployee_Process_SerialNoAndEmployee_CodeAndDateBetween(
            String processSerialNo,
            String employeeCode,
            LocalDate from,
            LocalDate to
    );
}
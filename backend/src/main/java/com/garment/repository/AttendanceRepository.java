package com.garment.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.garment.model.Attendance;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {

    Optional<Attendance> findByEmployee_CodeAndDate(String employeeCode, LocalDate date);

    List<Attendance> findByDateBetween(LocalDate from, LocalDate to);

    List<Attendance> findByEmployee_CodeAndDateBetween(String employeeCode, LocalDate from, LocalDate to);

    List<Attendance> findByEmployee_Process_SerialNoAndDateBetween(String processSerialNo, LocalDate from, LocalDate to);

    List<Attendance> findByEmployee_Process_SerialNoAndEmployee_CodeAndDateBetween(
            String processSerialNo,
            String employeeCode,
            LocalDate from,
            LocalDate to
    );
}
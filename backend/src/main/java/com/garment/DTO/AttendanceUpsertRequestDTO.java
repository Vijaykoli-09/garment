package com.garment.DTO;

import java.time.LocalDate;

import com.garment.enums.AttendanceStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceUpsertRequestDTO {
    private String employeeCode;
    private LocalDate date;
    private AttendanceStatus status; // PRESENT / ABSENT / HALF_DAY
}
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
public class AttendanceResponseDTO {
    private Long id;
    private String employeeCode;
    private String employeeName;

    private String processSerialNo;
    private String processName;

    private LocalDate date;
    private AttendanceStatus status;
}
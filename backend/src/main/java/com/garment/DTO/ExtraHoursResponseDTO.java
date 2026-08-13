package com.garment.DTO;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExtraHoursResponseDTO {
    private Long id;

    private String employeeCode;
    private String employeeName;

    private String processSerialNo;
    private String processName;

    private LocalDate date;

    private Double extraHours;
    private Double extraHourRate;
    private Double amount;

    private String remarks;
}
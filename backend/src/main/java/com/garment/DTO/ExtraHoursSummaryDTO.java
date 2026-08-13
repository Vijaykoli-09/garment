package com.garment.DTO;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Summary in date range.
 * Since rate can vary, we also provide derived averageRate = totalAmount/totalExtraHours.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExtraHoursSummaryDTO {
    private String employeeCode;
    private String employeeName;

    private String processSerialNo;
    private String processName;

    private LocalDate fromDate;
    private LocalDate toDate;

    private double totalExtraHours;
    private double totalAmount;
    private double averageRate;
}
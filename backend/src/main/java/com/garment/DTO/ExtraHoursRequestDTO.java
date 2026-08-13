package com.garment.DTO;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Amount is auto-calculated on backend:
 * amount = extraHours * extraHourRate
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExtraHoursRequestDTO {
    private String employeeCode;
    private LocalDate date;

    private Double extraHours;
    private Double extraHourRate;

    private String remarks;
}
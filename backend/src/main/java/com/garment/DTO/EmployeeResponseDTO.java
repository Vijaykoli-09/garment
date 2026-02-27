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
public class EmployeeResponseDTO {
    private String code;
    private String employeeName;
    private String gender;
    private LocalDate dateOfBirth;
    private LocalDate dateOfJoining;
    private String address;
    private String salaryType;
    private Double monthlySalary;
    private Double contractorPayment;
    private Double workingHours;
    private String contact;
    private String qualification;
    private Double openingBalance;
    private LocalDate asOn;
    private String under;
    private String processName; // Instead of full object
}
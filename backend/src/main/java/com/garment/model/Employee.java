package com.garment.model;

import java.time.LocalDate;

import com.garment.model.Process;
import com.garment.enums.Gender;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "employee")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Employee {
	@Id
	private String code;

	private String employeeName;

	@Enumerated(EnumType.STRING)
	private Gender gender;

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


	@ManyToOne
	@JoinColumn(name = "process_serial_no")
	private Process process; // Reference to Process entity
}


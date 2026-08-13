package com.garment.model;

import java.time.LocalDate;

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

	/**
	 * Keep as String to avoid breaking existing behavior.
	 * Frontend currently uses values like: PRODUCTION / ATTENDENCE.
	 * You can also use HOURLY / MONTHLY later without DB change.
	 */
	private String salaryType;

	private Double monthlySalary;

	/**
	 * Existing field kept unchanged (meaning NOT assumed).
	 */
	private Double contractorPayment;

	/**
	 * Existing field kept unchanged.
	 * Used as "normal working hours" (display + calculations) on frontend where applicable.
	 */
	private Double workingHours;

	/**
	 * ✅ New field for hour-based employees (NOT hard-coded; user can set).
	 * This avoids wrongly assuming contractorPayment meaning.
	 */
	private Double hourlyRate;

	private String contact;
	private String qualification;

	private Double openingBalance;
	private LocalDate asOn;
	private String under;

	@ManyToOne
	@JoinColumn(name = "process_serial_no")
	private Process process; // Reference to Process entity
}
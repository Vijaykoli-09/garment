package com.garment.model;

import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.Set;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.garment.enums.Gender;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
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
	private Double hourlyRate;
	private String contact;
	private String qualification;
	private Double openingBalance;
	private LocalDate asOn;
	private String under;

	// Legacy single-process relationship retained for compatibility.
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "process_serial_no")
	@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
	private Process process;

	// Multiple process assignments.
	@Builder.Default
	@ManyToMany(fetch = FetchType.LAZY)
	@JoinTable(
			name = "employee_process",
			joinColumns = @JoinColumn(
					name = "employee_code",
					referencedColumnName = "code"
			),
			inverseJoinColumns = @JoinColumn(
					name = "process_serial_no"
			)
	)
	@JsonIgnoreProperties({"employees", "hibernateLazyInitializer", "handler"})
	private Set<Process> processes = new LinkedHashSet<>();
}
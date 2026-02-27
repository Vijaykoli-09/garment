package com.garment.model;

import jakarta.persistence.Entity;

import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Data
@Entity
@Table(name = "grade")
public class CustomerGrade {
	 	@Id
	    private String serialNo;  // Primary Key 

	 	
	    private String gradeName;
}

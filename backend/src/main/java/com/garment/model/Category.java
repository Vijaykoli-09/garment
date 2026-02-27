package com.garment.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Data
@Entity
@Table(name = "category")
public class Category {
	 	@Id
	    private String serialNo;   // Serial No will be primary key

	    private String categoryName;
}

package com.garment.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "material")
@Data   
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Material {
	 @Id
	    @GeneratedValue(strategy = GenerationType.IDENTITY)
	    private Long id;

	    private String serialNumber;

	    @ManyToOne
	    @JoinColumn(name = "material_group_id") // FK to material_group
	    private MaterialGroup materialGroup;

	    private String materialName;
	    private String code;
	    private String materialUnit;
	    private Integer minimumStock;
	    private Integer maximumStock;
	    // ✅ New Field
	    private Integer openingStock;
}

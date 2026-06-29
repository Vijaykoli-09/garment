package com.garment.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
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

	    @ManyToOne(fetch = FetchType.EAGER)
		@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
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

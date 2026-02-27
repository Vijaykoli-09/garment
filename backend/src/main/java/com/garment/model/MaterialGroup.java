package com.garment.model;




import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import lombok.NoArgsConstructor;


@Entity
@Table(name = "material_group")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Data
public class MaterialGroup {
	@Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String materialGroup;
    private String materialType;
    private String unitOfMeasure;
    private Double costOfMaterial;
    private String supplierName;
}

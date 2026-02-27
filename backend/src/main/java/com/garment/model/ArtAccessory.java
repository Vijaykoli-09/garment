package com.garment.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "art_accessories")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ArtAccessory {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "art_serial_number", nullable = false)
    @JsonIgnore
    private Art art;
    
    @Column(name = "material_id")
    private Integer materialId;
    
    @Column(name = "serial_number")
    private String serialNumber;
    
    @Column(name = "material_group_id")
    private Integer materialGroupId;
    
    @Column(name = "material_group_name")
    private String materialGroupName;
    
    @Column(name = "material_name")
    private String materialName;
    
    @Column(name = "code")
    private String code;
    
    @Column(name = "material_unit")
    private String materialUnit;
    
    @Column(name = "minimum_stock")
    private String minimumStock;
    
    @Column(name = "maximum_stock")
    private String maximumStock;
}
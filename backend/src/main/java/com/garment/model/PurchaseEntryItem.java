package com.garment.model;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "purchase_entry_item")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseEntryItem {
	@Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "purchase_entry_id")
    @JsonIgnore
    private PurchaseEntry purchaseEntry;
    
    @ManyToOne
    @JoinColumn(name = "material_group_id")  // ✅ ADD THIS COLUMN
    private MaterialGroup materialGroup;

    // ✅ Changed from Art to Material
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "material_id")
    private Material material;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "shade_code", referencedColumnName = "shade_code", nullable = true)
    private Shade shade;


    private String roll;

    private Integer wtPerBox;   // Mapped from quantity

//    private Double weight;     // Manual input

    private Double rate;

    private Double amount;

    private String orderNo;    // From PurchaseOrder
    
 // ✅ Auto-fetched from Material
    private String unit;

    private String yarnName;

}

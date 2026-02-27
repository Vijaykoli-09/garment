package com.garment.model;


import com.fasterxml.jackson.annotation.JsonIgnore;



import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
import lombok.ToString;


@Entity
@Table(name = "purchase_order_item")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = "purchaseOrder")
public class PurchaseOrderItem {
	@Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "purchase_order_id")
    @JsonIgnore
    private PurchaseOrder purchaseOrder;
    
    @ManyToOne
    @JoinColumn(name = "material_group_id")
    private MaterialGroup materialGroup;


    // ✅ Changed from Art to Material
    @ManyToOne
    @JoinColumn(name = "material_id")
    private Material item;  // renamed from itemDescription

    @ManyToOne
    @JoinColumn(name = "shade_code")
    private Shade shade;

    private String roll;

    private Integer quantity;

    // ✅ Removed @Enumerated since unit is a simple string now
    private String unit;
    private Double rate;

    private Double amount;

    private String yarnName;

}

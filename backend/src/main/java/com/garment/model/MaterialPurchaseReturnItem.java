package com.garment.model;

import jakarta.persistence.Entity;
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
@Table(name = "material_purchase_return_item")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = "materialPurchaseReturn")
public class MaterialPurchaseReturnItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "material_purchase_return_id")
    private MaterialPurchaseReturn materialPurchaseReturn;

    @ManyToOne
    @JoinColumn(name = "material_id")
    private Material material;

    @ManyToOne
    @JoinColumn(name = "shade_code")
    private Shade shade;

    private String returnRolls;

    private Integer quantity;

    private Double returnWeight;   // ✅ added (because your UI has returnWeight)

    private String unit;

    private Double rate;

    private Double amount;

    private String orderNo;
}
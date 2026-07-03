package com.garment.model;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "purchase_entry_items")
@Data
@NoArgsConstructor
public class MaterialPurchaseEntryItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Parent Purchase Entry
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entry_id", nullable = false)
    private MaterialPurchaseEntry purchaseEntry;

    // Linked Material
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "material_id")
    private Material material;

    @Column(name = "material_name")
    private String materialName;

    private String unit;

    @Column(name = "shade_code")
    private String shadeCode;

    @Column(name = "shade_name")
    private String shadeName;

    @Column(name = "order_no")
    private String orderNo;

    private BigDecimal roll = BigDecimal.ZERO;

    @Column(name = "wt_per_box")
    private BigDecimal wtPerBox = BigDecimal.ZERO;

    private BigDecimal rate = BigDecimal.ZERO;

    private BigDecimal amount = BigDecimal.ZERO;
}
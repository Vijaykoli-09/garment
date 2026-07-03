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

@Entity
@Table(name = "material_purchase_order_item")
public class MaterialPurchaseOrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // parent
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_id", nullable = false)
    private MaterialPurchaseOrder purchaseOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "material_group_id")
    private MaterialGroup materialGroup;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "material_id")
    private Material material;

    @Column(name = "shade_code", length = 50)
    private String shadeCode;

    @Column(name = "roll", length = 50)
    private String roll;

    @Column(name = "quantity")
    private Integer quantity;

    @Column(name = "unit", length = 20)
    private String unit;

    @Column(name = "rate", precision = 12, scale = 2)
    private BigDecimal rate;

    @Column(name = "amount", precision = 14, scale = 2)
    private BigDecimal amount;

    // ----- getters/setters -----
    public Long getId() { return id; }

    public MaterialPurchaseOrder getPurchaseOrder() { return purchaseOrder; }
    public void setPurchaseOrder(MaterialPurchaseOrder purchaseOrder) { this.purchaseOrder = purchaseOrder; }

    public MaterialGroup getMaterialGroup() { return materialGroup; }
    public void setMaterialGroup(MaterialGroup materialGroup) { this.materialGroup = materialGroup; }

    public Material getMaterial() { return material; }
    public void setMaterial(Material material) { this.material = material; }

    public String getShadeCode() { return shadeCode; }
    public void setShadeCode(String shadeCode) { this.shadeCode = shadeCode; }

    public String getRoll() { return roll; }
    public void setRoll(String roll) { this.roll = roll; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public BigDecimal getRate() { return rate; }
    public void setRate(BigDecimal rate) { this.rate = rate; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
}
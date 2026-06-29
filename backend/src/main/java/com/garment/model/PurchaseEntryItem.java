package com.garment.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_entry_id")
    @JsonIgnore
    private PurchaseEntry purchaseEntry;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "material_group_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private MaterialGroup materialGroup;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "material_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Material material;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "shade_code", referencedColumnName = "shade_code", nullable = true)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Shade shade;

    private String roll;
    private Integer wtPerBox;
    private Double rate;
    private Double amount;
    private String orderNo;
    private String unit;
    private String yarnName;
}
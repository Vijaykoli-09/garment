package com.garment.model;

import java.math.BigDecimal;

import jakarta.persistence.*;

import lombok.Data;

@Entity
@Table(name = "other_dispatch_challan_row")
@Data
public class OtherDispatchRow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "challan_id")
    private OtherDispatchChallan challan;

    // ---- EXACTLY as frontend: ----
    private String materialGroupName;
    private String materialName;
    private String unit;
    private Integer qty;
    private BigDecimal rate;
    private BigDecimal amt;
}
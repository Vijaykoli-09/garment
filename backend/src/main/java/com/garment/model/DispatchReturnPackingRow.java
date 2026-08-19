package com.garment.model;

import java.math.BigDecimal;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "dispatch_return_challan_packing_row")
@Data
public class DispatchReturnPackingRow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "challan_id")
    private DispatchReturnChallan challan;

    private String itemName;
    private BigDecimal quantity;
}
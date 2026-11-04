package com.garment.model;

import lombok.ToString;
import lombok.EqualsAndHashCode;
import java.math.BigDecimal;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "dispatch_return_challan_packing_row", indexes = {
        @Index(name = "idx_dispatch_return_packing_challan_id", columnList = "challan_id")
})
@Data
public class DispatchReturnPackingRow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "challan_id")
    @ToString.Exclude @EqualsAndHashCode.Exclude
    private DispatchReturnChallan challan;

    private String itemName;
    private BigDecimal quantity;
}
package com.garment.model;

import lombok.ToString;
import lombok.EqualsAndHashCode;
import java.math.BigDecimal;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "dispatch_return_challan_row", indexes = {
        @Index(name = "idx_dispatch_return_row_challan_id", columnList = "challan_id"),
        @Index(name = "idx_dispatch_return_row_art_no", columnList = "art_no")
})
@Data
public class DispatchReturnRow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "challan_id")
    @ToString.Exclude @EqualsAndHashCode.Exclude
    private DispatchReturnChallan challan;

    private String barCode;
    private String baleNo;
    private String artNo;
    private String description;
    private String lotNumber;
    private String size;
    private String shade;

    private Integer box;
    private Integer pcsPerBox;
    private Integer pcs;

    private BigDecimal rate;
    private BigDecimal amt;
}
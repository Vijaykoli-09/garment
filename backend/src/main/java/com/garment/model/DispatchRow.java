package com.garment.model;

import jakarta.persistence.Index;
import lombok.ToString;
import lombok.EqualsAndHashCode;
import java.math.BigDecimal;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "dispatch_challan_row", indexes = {
        @Index(name = "idx_dispatch_row_challan_id", columnList = "challan_id"),
        @Index(name = "idx_dispatch_row_art_no", columnList = "art_no")
})
@Data
public class DispatchRow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "challan_id")
    @ToString.Exclude @EqualsAndHashCode.Exclude
    private DispatchChallan challan;

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
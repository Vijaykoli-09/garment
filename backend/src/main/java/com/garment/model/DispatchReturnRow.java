package com.garment.model;

import java.math.BigDecimal;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "dispatch_return_challan_row")
@Data
public class DispatchReturnRow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "challan_id")
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
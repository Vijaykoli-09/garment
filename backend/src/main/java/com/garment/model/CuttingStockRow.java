package com.garment.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "cutting_stock_rows")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CuttingStockRow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sno")
    private Integer sno;

    @Column(name = "finishing_inward_row_id")
    private Long finishingInwardRowId;

    @Column(name = "item_name")
    private String itemName;

    @Column(name = "shade")
    private String shade;

    @Column(name = "unit")
    private String unit;

    @Column(name = "consumption")
    private String consumption;

    // NEW
    @Column(name = "kho")
    private String kho;

    @Column(name = "cons_rate")
    private String consRate;

    @Column(name = "cons_amount")
    private String consAmount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cutting_entry_serial_no")
    private CuttingEntry cuttingEntry;
}
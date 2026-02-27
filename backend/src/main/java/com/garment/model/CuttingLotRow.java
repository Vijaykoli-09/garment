package com.garment.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "cutting_lot_rows")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CuttingLotRow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sno")
    private Integer sno;

    @Column(name = "cut_lot_no")
    private String cutLotNo;

    @Column(name = "art_no")
    private String artNo;

    @Column(name = "item_name")
    private String itemName;

    @Column(name = "shade")
    private String shade;

    @Column(name = "pcs")
    private String pcs;

    @Column(name = "rate")
    private String rate;

    @Column(name = "amount")
    private String amount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cutting_entry_serial_no")
    private CuttingEntry cuttingEntry;
}
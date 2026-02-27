package com.garment.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Entity
@Table(name = "job_outward_challan_rows")
@NoArgsConstructor
@AllArgsConstructor
public class JobOutwardChallanRow {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sno")
    private Integer sno;

    // Cutting lot number (reference text) — user will select from CuttingLotRow.cutLotNo
    @Column(name = "cut_lot_no")
    private String cutLotNo;

    // art no fetched from CuttingLotRow
    @Column(name = "art_no")
    private String artNo;

    // cutting dozen pcs fetched from CuttingLotRow -> pcs (string)
    @Column(name = "cutting_dozen_pcs")
    private String cuttingDozenPcs;

    // size selected by user (you can change to relation if you have Size entity)
    @Column(name = "size")
    private String size;

    // manually entered pcs
    @Column(name = "pcs")
    private String pcs;

    @Column(name = "narration")
    private String narration;

    @Column(name = "target_date")
    private LocalDate targetDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_outward_challan_serial_no")
    private JobOutwardChallan jobOutwardChallan;
}

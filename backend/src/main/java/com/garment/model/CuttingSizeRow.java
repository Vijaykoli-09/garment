package com.garment.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "cutting_size_rows")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CuttingSizeRow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // link size row to cutting lot row via sno (1,2,3...)
    @Column(name = "lot_sno")
    private Integer lotSno;

    @Column(name = "size_name")
    private String size;

    @Column(name = "box")
    private String box;

    @Column(name = "pcs_per_box")
    private String pcsPerBox;

    @Column(name = "total_pcs")
    private String totalPcs;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cutting_entry_serial_no")
    private CuttingEntry cuttingEntry;
}
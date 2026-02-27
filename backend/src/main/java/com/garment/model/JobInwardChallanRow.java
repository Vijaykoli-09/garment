package com.garment.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "job_inward_challan_row")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobInwardChallanRow {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Integer seq; // row sequence (1,2,3...)

    private String cuttinglotNumber;
    private String cuttingDozen;

    // store canonical serial or raw art text
    private String artNo;

    private String sizeName;
    private Integer pcs;
    private String wastage;

    private BigDecimal rate;
    private BigDecimal amount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inward_challan_id")
    private JobInwardChallan inwardChallan;
}

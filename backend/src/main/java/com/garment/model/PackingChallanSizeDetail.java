package com.garment.model;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "packing_challan_size_details")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PackingChallanSizeDetail {
	@Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Parent row (one row can have many size details) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "row_id", nullable = false)
    private PackingChallanRow row;

    /** Optional reference to master Size entity */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "size_id")
    private Size size;

    /** Readable size label, e.g. S, M, L, XL */
    @Column(name = "size_name", length = 30)
    private String sizeName;

    @Column(name = "box_count")
    private Integer boxCount;

    @Column(name = "per_box")
    private Integer perBox;

    @Column(name = "pcs")
    private Integer pcs;

    @Column(name = "rate", precision = 12, scale = 2)
    private BigDecimal rate;

    @Column(name = "amount", precision = 14, scale = 2)
    private BigDecimal amount;
}

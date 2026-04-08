package com.garment.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "art_stock_adjustments")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ArtStockAdjustment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="adj_date", nullable = false)
    private LocalDate adjDate;

    @Column(name="art_serial")
    private String artSerial;

    @Column(name="art_group")
    private String artGroup;

    @Column(name="art_no", nullable = false)
    private String artNo;

    @Column(name="art_name")
    private String artName;

    @Column(name="shade_code")
    private String shadeCode;

    @Column(name="shade_name", nullable = false)
    private String shadeName;

    @Column(name="size_serial")
    private String sizeSerial;

    @Column(name="size_name", nullable = false)
    private String sizeName;

    @Column(name="pcs_delta", nullable = false, precision = 18, scale = 3)
    private BigDecimal pcsDelta;

    @Column(name="per_box", precision = 18, scale = 3)
    private BigDecimal perBox;

    @Column(name="rate", precision = 18, scale = 2)
    private BigDecimal rate;

    @Column(name="remarks")
    private String remarks;

    @Column(name="created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;
}
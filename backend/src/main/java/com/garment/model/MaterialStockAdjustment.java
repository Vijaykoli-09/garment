package com.garment.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "material_stock_adjustments")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class MaterialStockAdjustment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="adj_date", nullable = false)
    private LocalDate adjDate;

    @Column(name="material_group_id", nullable = false)
    private Long materialGroupId;

    @Column(name="material_id", nullable = false)
    private Long materialId;

    @Column(name="shade_name")
    private String shadeName;

    @Column(name="qty_delta", nullable = false, precision = 18, scale = 3)
    private BigDecimal qtyDelta;

    @Column(name="remarks")
    private String remarks;

    @Column(name="created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;
}
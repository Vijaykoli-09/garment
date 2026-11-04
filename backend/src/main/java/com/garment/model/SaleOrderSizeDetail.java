package com.garment.model;

import lombok.ToString;
import lombok.EqualsAndHashCode;
import java.math.BigDecimal;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "sale_order_size_details", indexes = {
        @Index(name = "idx_sosd_row_id", columnList = "row_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SaleOrderSizeDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Parent row */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "row_id", nullable = false)
    @ToString.Exclude @EqualsAndHashCode.Exclude
    private SaleOrderRow row;

    /** Optional master Size reference */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "size_id")
    @ToString.Exclude @EqualsAndHashCode.Exclude
    private Size size;

    @Column(name = "size_name", length = 30)
    private String sizeName;

    @Column(name = "qty")
    private Integer qty;

    @Column(name = "rate", precision = 12, scale = 2)
    private BigDecimal rate;
}
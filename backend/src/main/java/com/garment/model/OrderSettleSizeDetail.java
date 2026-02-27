package com.garment.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "order_settle_size_details")
@Data
@NoArgsConstructor
public class OrderSettleSizeDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Parent row */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "row_id", nullable = false)
    private OrderSettleRow row;

    @Column(name = "size_name", length = 30)
    private String sizeName;

    /** UI mein "Box" / "Qty" */
    @Column(name = "settle_box")
    private Integer settleBox;
}
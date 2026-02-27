package com.garment.model;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "order_settle_rows")
@Data
@NoArgsConstructor
public class OrderSettleRow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Parent document */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "settle_id")
    private OrderSettle settle;

    // Optional link to Sale Order
    @Column(name = "sale_order_id")
    private Long saleOrderId;

    @Column(name = "sale_order_no", length = 50)
    private String saleOrderNo;

    @Column(name = "sale_order_row_id")
    private Long saleOrderRowId;

    @Column(name = "bar_code", length = 100)
    private String barCode;

    @Column(name = "art_no", length = 100)
    private String artNo;

    @Column(name = "description", length = 300)
    private String description;

    @Column(name = "shade_name", length = 100)
    private String shade;

    @OneToMany(mappedBy = "row", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id asc")
    private List<OrderSettleSizeDetail> sizeDetails = new ArrayList<>();

    public void addSize(OrderSettleSizeDetail d){
        sizeDetails.add(d);
        d.setRow(this);
    }
}
package com.garment.model;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "sale_order_rows")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SaleOrderRow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="sno")
    private Integer sno;

    @Column(name="art_serial", length=50)
    private String artSerial;

    @Column(name="art_no", length=100)
    private String artNo;

    @Column(name="description", length=300)
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="shade_code", referencedColumnName = "shade_code")
    private Shade shade;                  // optional M2O

    @Column(name="shade_name", length=100)
    private String shadeName;             // denormalized name

    @Column(name="peti")
    private Integer peti;

    @Column(name="remarks", length=300)
    private String remarks;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sale_order_id")
    private SaleOrder saleOrder;

    @OneToMany(mappedBy = "row", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id asc")
    private List<SaleOrderSizeDetail> sizeDetails = new ArrayList<>();

    public void addSize(SaleOrderSizeDetail d){
        sizeDetails.add(d);
        d.setRow(this);
    }
}
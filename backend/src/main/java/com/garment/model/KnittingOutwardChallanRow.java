package com.garment.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "knitting_outward_row")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class KnittingOutwardChallanRow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "knitting_outward_id") // FK column in DB
    @JsonBackReference
    private KnittingOutwardChallan knittingOutwardChallan;

    // Optional: if each row is linked to a PurchaseEntry
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_entry_id")
    @JsonIgnore
    private PurchaseEntry purchaseEntry;


    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "material_id")
    private Material material;


    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "shade_code")
    private Shade shade;


    private String roll;
    private Integer wtPerBox;
    private Double weight;
    private Double rate;
    private Double amount;
    private String orderNo;
    private String yarnName;
    private String unit;


    public void setKnittingOutwardChallan(KnittingOutwardChallan challan) {
        this.knittingOutwardChallan = challan;
    }
}

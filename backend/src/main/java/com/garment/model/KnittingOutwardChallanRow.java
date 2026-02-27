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

    // ✅ Proper parent relationship (bidirectional)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "knitting_outward_id") // FK column in DB
    @JsonBackReference
    private KnittingOutwardChallan knittingOutwardChallan;

    // Optional: if each row is linked to a PurchaseEntry
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_entry_id")
    @JsonIgnore
    private PurchaseEntry purchaseEntry;

    // ✅ Material link
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "material_id")
    private Material material;

    // ✅ Shade link
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "shade_code")
    private Shade shade;

    // ✅ Core fields
    private String roll;
    private Integer wtPerBox;
    private Double weight;
    private Double rate;
    private Double amount;
    private String orderNo;
    private String unit;

    // ✅ Ensure bidirectional JPA relationship works
    public void setKnittingOutwardChallan(KnittingOutwardChallan challan) {
        this.knittingOutwardChallan = challan;
    }
}

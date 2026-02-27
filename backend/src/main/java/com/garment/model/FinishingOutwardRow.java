package com.garment.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;

@Entity
@Table(name = "finishing_outward_row")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FinishingOutwardRow {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    

    // @Column(name = "lot_internal_no")
    // private String lotInternalNo;

    @Column(name = "lot_no")
    private String lotNo;
    
    @Column(name = "item_name")
    private String itemName;
    
    @Column(name = "shade")
    private String shade;
    
    @Column(name = "mc_size")
    private String mcSize;
    
    @Column(name = "grey_gsm")
    private String greyGSM;
    
    @Column(name = "regd_gsm")
    private String regdGSM;

    
    
    @Column(name = "rolls")
    private String rolls;
    
    @Column(name = "weight")
    private String weight;
    
    @Column(name = "rate_fnd")
    private String rateFND;

    // @Column(name = "rate")
    // private String rate;

    @Column(name = "cloth_wt")
    private String clothWt;

    @Column(name = "rib_wt")
    private String ribWt;
    
    @Column(name = "amount")
    private String amount;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "finishing_outward_id")
    @JsonIgnore
    private FinishingOutward finishingOutward;
    
}

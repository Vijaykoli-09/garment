package com.garment.model;


import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;
import lombok.*;



@Entity
@Table(name = "finishing_inward_row")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FinishingInwardRow {
 
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "lot_no")
    private String lotNo;
    
    @Column(name = "item_name")
    private String itemName;

    @Column(name = "processing")
    private String processing;
    
    @Column(name = "wastage")
    private String wastage;
    
    @Column(name = "extra_wt")
    private String extraWt;

    @Column(name = "shade")
    private String shade;

    // @Column(name = "stock_rate")
    // private String stockRate;

    @Column(name = "rate_fnd")
    private String rateFND;
    
    @Column(name = "rolls")
    private String rolls;
    
    @Column(name = "weight")
    private String weight;
    
    @Column(name = "rate")
    private String rate;

    
    @Column(name = "amount")
    private String amount;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "finishing_inward_id")
    @JsonIgnore
    private FinishingInward finishingInward;
    

}

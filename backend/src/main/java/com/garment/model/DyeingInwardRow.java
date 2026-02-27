package com.garment.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "dyeing_inward_row")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DyeingInwardRow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "fabric_lot_no")
    private String fabricLotNo;

    @Column(name = "fabric")
    private String fabric;

    @Column(name = "shade")
    private String shade;

    @Column(name = "mc_size")
    private String mcSize;

    @Column(name = "grey_gsm")
    private String greyGSM;

    @Column(name = "regd_size")
    private String regdSize;

    @Column(name = "rolls")
    private String rolls;

    @Column(name = "weight")
    private String weight;

    @Column(name = "wastage")
    private String wastage;

    @Column(name = "knitting_yarn_rate")
    private String knittingYarnRate;

    @Column(name = "dyeing_rate")
    private String dyeingRate;

    @Column(name = "amount")
    private String amount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dyeing_inward_id")
    @JsonIgnore
    private DyeingInward dyeingInward;
}
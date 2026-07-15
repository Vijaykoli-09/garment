package com.garment.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

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

    @Column(name = "rolls")
    private String rolls;

    @Column(name = "weight")
    private String weight;

    // renamed from wastage -> shortage
    @Column(name = "shortage")
    private String shortage;

    // NEW column after shortage
    @Column(name = "percentage")
    private String percentage;

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
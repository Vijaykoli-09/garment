package com.garment.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "knitting_row")
public class KnittingRow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String fabricLotNo;

    private Double shortage;
    private Double percentage;

    private Integer rolls;
    private Double weight;
    private Double knittingRate;

    private Double yarnRate;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "fabrication_serial_no", referencedColumnName = "serial_no")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Fabrication fabrication;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "yarn_serial_no", referencedColumnName = "serial_no")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Yarn yarn;

    @ManyToOne
    @JoinColumn(name = "knitting_inward_id")
    @JsonBackReference
    private KnittingInward knittingInward;
}
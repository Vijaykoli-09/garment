package com.garment.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
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
    private String shade;
    private String processing;
    private Integer rolls;
    private Double weight;
    private Double knittingRate;

    // Reference to Fabrication (use serialNo as id in your model)
    @ManyToOne
    @JoinColumn(name = "fabrication_serial_no", referencedColumnName = "serial_no")
    private Fabrication fabrication;

    // Reference to Yarn (serial_no)
    @ManyToOne
    @JoinColumn(name = "yarn_serial_no", referencedColumnName = "serial_no")
    private Yarn yarn;

    @ManyToOne
    @JoinColumn(name = "knitting_inward_id")
    @JsonBackReference
    private KnittingInward knittingInward;
}

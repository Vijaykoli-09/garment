package com.garment.model;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "fabrication_yarn")
public class FabricationYarn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fabrication_serial_no")
    private Fabrication fabrication;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "yarn_serial_no")
    private Yarn yarn;

    @Column(precision = 5, scale = 2)
    private BigDecimal percent;

    public FabricationYarn() {}

    public FabricationYarn(Fabrication fabrication, Yarn yarn, BigDecimal percent) {
        this.fabrication = fabrication;
        this.yarn = yarn;
        this.percent = percent;
    }

    public Long getId() { return id; }

    public Fabrication getFabrication() { return fabrication; }
    public void setFabrication(Fabrication fabrication) { this.fabrication = fabrication; }

    public Yarn getYarn() { return yarn; }
    public void setYarn(Yarn yarn) { this.yarn = yarn; }

    public BigDecimal getPercent() { return percent; }
    public void setPercent(BigDecimal percent) { this.percent = percent; }
}


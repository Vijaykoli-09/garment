package com.garment.model;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "fabrication")
public class Fabrication{

    @Id
    @Column(name = "serial_no", length = 100)
    private String serialNo; // Auto-generated (e.g., FAB-202510141912)

    @Column(name = "fabric_name", nullable = false)
    private String fabricName;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "yarn_serial_no", referencedColumnName = "serial_no")
    private Yarn yarn;

    @Column(name = "percent", precision = 5, scale = 2)
    private BigDecimal percent; // e.g. 50.00

    public Fabrication() {}

    public Fabrication(String serialNo, String fabricName, Yarn yarn, BigDecimal percent) {
        this.serialNo = serialNo;
        this.fabricName = fabricName;
        this.yarn = yarn;
        this.percent = percent;
    }

    // Getters and Setters
    public String getSerialNo() { return serialNo; }
    public void setSerialNo(String serialNo) { this.serialNo = serialNo; }

    public String getFabricName() { return fabricName; }
    public void setFabricName(String fabricName) { this.fabricName = fabricName; }

    public Yarn getYarn() { return yarn; }
    public void setYarn(Yarn yarn) { this.yarn = yarn; }

    public BigDecimal getPercent() { return percent; }
    public void setPercent(BigDecimal percent) { this.percent = percent; }
}

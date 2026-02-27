package com.garment.model;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "yarn")
public class Yarn {

    @Id
    @Column(name = "serial_no", length = 100)
    private String serialNo;

    @Column(name = "yarn_name", nullable = false)
    private String yarnName;

    @Column(name = "unit", nullable = false)
    private String unit = "kg";

    @Column(name = "rate", precision = 19, scale = 4)
    private BigDecimal rate;

    public Yarn() {}

    public Yarn(String serialNo, String yarnName, String unit, BigDecimal rate) {
        this.serialNo = serialNo;
        this.yarnName = yarnName;
        this.unit = unit;
        this.rate = rate;
    }

    // Getters and Setters
    public String getSerialNo() { return serialNo; }
    public void setSerialNo(String serialNo) { this.serialNo = serialNo; }

    public String getYarnName() { return yarnName; }
    public void setYarnName(String yarnName) { this.yarnName = yarnName; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public BigDecimal getRate() { return rate; }
    public void setRate(BigDecimal rate) { this.rate = rate; }
}

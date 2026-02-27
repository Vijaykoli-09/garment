package com.garment.model;

import jakarta.persistence.*;

@Entity
@Table(name = "shades")
public class Shade {

    @Id
    @Column(name = "shade_code", nullable = false, unique = true, length = 10)
    private String shadeCode;  // Example: SH25123

    @Column(name = "shade_name", nullable = false, length = 100)
    private String shadeName;

    // Constructors
    public Shade() {}

    public Shade(String shadeCode, String shadeName) {
        this.shadeCode = shadeCode;
        this.shadeName = shadeName;
    }

    // Getters and Setters
    public String getShadeCode() {
        return shadeCode;
    }

    public void setShadeCode(String shadeCode) {
        this.shadeCode = shadeCode;
    }

    public String getShadeName() {
        return shadeName;
    }

    public void setShadeName(String shadeName) {
        this.shadeName = shadeName;
    }

}

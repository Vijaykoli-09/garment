package com.garment.model;

import jakarta.persistence.*;

@Entity
@Table(name = "accessories")
public class Accessories {

    @Id
    @Column(name = "serial_number", nullable = false, unique = true)
    private String serialNumber;

    @Column(name = "process_name", nullable = false)
    private String processName;

    @Column(name = "material_name", nullable = false)
    private String materialName;

    // Constructors
    public Accessories() {}

    public Accessories(String serialNumber, String processName, String materialName) {
        this.serialNumber = serialNumber;
        this.processName = processName;
        this.materialName = materialName;
    }

    // Getters and Setters
    public String getSerialNumber() {
        return serialNumber;
    }
    public void setSerialNumber(String serialNumber) {
        this.serialNumber = serialNumber;
    }

    public String getProcessName() {
        return processName;
    }
    public void setProcessName(String processName) {
        this.processName = processName;
    }

    public String getMaterialName() {
        return materialName;
    }
    public void setMaterialName(String materialName) {
        this.materialName = materialName;
    }
}

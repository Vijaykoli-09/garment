package com.garment.DTO;

import java.util.List;

public class FabricationDTO {
    private String serialNo;
    private String fabricName;
    private List<FabricationYarnDTO> yarns; // ✅ Multiple yarns

    // Getters & Setters
    public String getSerialNo() { return serialNo; }
    public void setSerialNo(String serialNo) { this.serialNo = serialNo; }

    public String getFabricName() { return fabricName; }
    public void setFabricName(String fabricName) { this.fabricName = fabricName; }

    public List<FabricationYarnDTO> getYarns() { return yarns; }
    public void setYarns(List<FabricationYarnDTO> yarns) { this.yarns = yarns; }
}

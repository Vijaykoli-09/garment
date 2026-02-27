package com.garment.DTO;

import java.math.BigDecimal;

public class FabricationYarnDTO {
    private String yarnSerialNo;
    private String yarnName;   // ✅ Add this
    private BigDecimal percent;

    public String getYarnSerialNo() { return yarnSerialNo; }
    public void setYarnSerialNo(String yarnSerialNo) { this.yarnSerialNo = yarnSerialNo; }

    public String getYarnName() { return yarnName; }
    public void setYarnName(String yarnName) { this.yarnName = yarnName; }

    public BigDecimal getPercent() { return percent; }
    public void setPercent(BigDecimal percent) { this.percent = percent; }
}

package com.garment.DTO;

import java.util.List;

public class DyeingOutwardDTO {
    private String challanNo;
    private String dated;
    private String partyName;
    private String narration;
    private String vehicleNo;
    private String through;
    private List<DyeingOutwardDTO> rows;

    // getters and setters
    public String getChallanNo() { return challanNo; }
    public void setChallanNo(String challanNo) { this.challanNo = challanNo; }
    public String getDated() { return dated; }
    public void setDated(String dated) { this.dated = dated; }
    public String getPartyName() { return partyName; }
    public void setPartyName(String partyName) { this.partyName = partyName; }
    public String getNarration() { return narration; }
    public void setNarration(String narration) { this.narration = narration; }
    public String getVehicleNo() { return vehicleNo; }
    public void setVehicleNo(String vehicleNo) { this.vehicleNo = vehicleNo; }
    public String getThrough() { return through; }
    public void setThrough(String through) { this.through = through; }
    public List<DyeingOutwardDTO> getRows() { return rows; }
    public void setRows(List<DyeingOutwardDTO> rows) { this.rows = rows; }
}

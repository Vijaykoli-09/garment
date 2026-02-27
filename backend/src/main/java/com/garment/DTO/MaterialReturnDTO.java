package com.garment.DTO;

import java.util.List;

public class MaterialReturnDTO {
    public String docType;
    public String challanNo;
    public String dated; // expecting yyyy-MM-dd from frontend
    public String partyName;
    public Long partyId;
    public Long inwardId;
    public String vehicleNo;
    public String through;
    public String narration;
    public Integer totalRolls;
    public Double totalWeight;
    public Double totalWastage;
    public List<MaterialReturnRowDTO> rows;
}

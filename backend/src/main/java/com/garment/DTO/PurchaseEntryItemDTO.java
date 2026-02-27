package com.garment.DTO;



import lombok.Data;

@Data
public class PurchaseEntryItemDTO {
	private Long materialGroupId;   // ✅ ADD THIS
    private Long materialId;        // ✅ Instead of artSerialNumber
    private String materialName;    // ✅ Instead of artName
    private String shadeCode;
    private String shadeName;
    private String roll;
    private Integer wtPerBox;
//    private Double weight;
    private Double rate;
    private Double amount;
    private String unit;            // ✅ new
    private String orderNo;

    private String yarnName;
}


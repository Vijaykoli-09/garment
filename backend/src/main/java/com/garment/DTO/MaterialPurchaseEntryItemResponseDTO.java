package com.garment.DTO;

import com.garment.model.Shade;

import lombok.Data;

@Data
public class MaterialPurchaseEntryItemResponseDTO {

    private Long id;
    private String orderNo;
    private String shadeCode;
    private String shadeName;
    private Double roll;
    private Double wtPerBox;
    private Double rate;
    private Double amount;

    // For React: i.material?.materialName OR i.materialName
    private MaterialResponseDTO material;
    private String materialName;
    private String unit;
    public void setShade(Shade shade) {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'setShade'");
    }
}
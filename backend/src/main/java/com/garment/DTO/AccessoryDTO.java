package com.garment.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AccessoryDTO {
    private Long id;
    private Integer materialId;
    private String serialNumber;
    private Integer materialGroupId;
    private String materialGroupName;
    private String materialName;
    private String code;
    private String materialUnit;
    private String minimumStock;
    private String maximumStock;
}
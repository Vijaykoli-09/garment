package com.garment.DTO;

import lombok.Data;

@Data
public class PurchaseOrderItemDTO {

    private Long materialGroupId;   // nullable
    private Long materialId;        // nullable
    private String materialName;

    private String shadeCode;       // nullable
    private String roll;            // nullable

    private Integer quantity;       // must remain nullable (Yarn-only row has no qty)
    private Double rate;            // nullable
    private Double amount;          // nullable

    private String unit;            // nullable (Yarn rows have no unit)

    private String yarnName;        // Yarn-only rows use this
}

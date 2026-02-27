package com.garment.DTO;

import lombok.Data;

@Data
public class OrderSettleSizeDetailDTO {
    private Long id;
    private String sizeName;
    private Integer settleBox;
}
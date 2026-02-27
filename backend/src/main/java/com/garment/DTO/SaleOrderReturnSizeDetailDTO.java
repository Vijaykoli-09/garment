package com.garment.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @NoArgsConstructor @AllArgsConstructor
public class SaleOrderReturnSizeDetailDTO {
    private Long sizeId;        // optional
    private String sizeName;
    private Integer qty;
}
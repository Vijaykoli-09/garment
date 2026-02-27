package com.garment.DTO;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @NoArgsConstructor @AllArgsConstructor
public class SaleOrderSizeDetailDTO {
    private Long sizeId;        // optional
    private String sizeName;
    private Integer qty;
    private BigDecimal rate;
}
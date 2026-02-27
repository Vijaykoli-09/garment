package com.garment.DTO;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PackingChallanSizeDetailDTO {
	private Long id;
    private Long sizeId;
    private String sizeName;
    private Integer boxCount;
    private Integer perBox;
    private Integer pcs;
    private BigDecimal rate;
    private BigDecimal amount;
}

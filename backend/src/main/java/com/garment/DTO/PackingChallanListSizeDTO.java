package com.garment.DTO;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Size-wise values shown in Packing Challan View List. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PackingChallanListSizeDTO {
    private String sizeName;
    private Integer boxCount;
    private Integer perBox;
    private Integer pcs;
    private BigDecimal rate;
    private BigDecimal amount;
}

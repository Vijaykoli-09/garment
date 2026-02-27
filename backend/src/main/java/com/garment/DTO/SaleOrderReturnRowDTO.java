package com.garment.DTO;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @NoArgsConstructor @AllArgsConstructor
public class SaleOrderReturnRowDTO {
    private Integer sno;

    private Long saleOrderId;       // optional
    private Long saleOrderRowId;    // optional
    private String saleOrderNo;     // convenience (from linked SO)

    private String artSerial;
    private String artNo;
    private String description;

    private String shadeCode;
    private String shadeName;

    private Integer returnPeti;
    private String reason;
    private String remarks;

    private List<SaleOrderReturnSizeDetailDTO> sizeDetails;
}
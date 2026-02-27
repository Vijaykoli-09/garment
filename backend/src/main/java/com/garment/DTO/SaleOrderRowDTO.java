package com.garment.DTO;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @NoArgsConstructor @AllArgsConstructor
public class SaleOrderRowDTO {
    private Integer sno;
    private String artSerial;
    private String artNo;
    private String description;
    private String shadeCode;
    private String shadeName;
    private Integer peti;
    private String remarks;
    private List<SaleOrderSizeDetailDTO> sizeDetails;
}
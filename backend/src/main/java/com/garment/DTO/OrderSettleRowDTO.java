package com.garment.DTO;

import java.util.List;

import lombok.Data;

@Data
public class OrderSettleRowDTO {
    private Long id;

    private Long saleOrderId;
    private String saleOrderNo;
    private Long saleOrderRowId;

    private String barCode;
    private String artNo;
    private String description;
    private String shade;

    private List<OrderSettleSizeDetailDTO> sizeDetails;
}
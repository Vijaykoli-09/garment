package com.garment.DTO;

import java.math.BigDecimal;

import lombok.Data;

@Data
public class DispatchRowDto {

    private Long id;            // sent back to React for row key; ignored on save
    private String barCode;
    private String baleNo;
    private String artNo;
    private String description;
    private String lotNumber;
    private String size;
    private String shade;
    private Integer box;
    private Integer pcsPerBox;
    private Integer pcs;
    private BigDecimal rate;
    private BigDecimal amt;
}
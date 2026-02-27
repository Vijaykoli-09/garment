package com.garment.DTO;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class OtherDispatchRowDto {

    private Long id;

    // EXACT names as in frontend ItemRow:
    private String materialGroupName;
    private String materialName;
    private String unit;
    private Integer qty;
    private BigDecimal rate;
    private BigDecimal amt;
}
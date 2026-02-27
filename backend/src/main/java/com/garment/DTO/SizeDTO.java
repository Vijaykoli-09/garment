package com.garment.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SizeDTO {
    private Long id;
    private String serialNo;
    private String sizeName;
    private String orderNo;
    private String artGroup;
}
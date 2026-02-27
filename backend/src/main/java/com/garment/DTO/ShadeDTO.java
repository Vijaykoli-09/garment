package com.garment.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ShadeDTO {
    private Long id;
    private String shadeCode;
    private String shadeName;
    private String colorFamily;
}
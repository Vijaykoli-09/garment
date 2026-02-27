package com.garment.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RangeDTO {
    private String serialNumber;
    private String rangeName;
    
    private String startValue;
    private String endValue;
    
}

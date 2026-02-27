package com.garment.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AccessoryDetailModalResponseDTO {
    private Long id;
    private String processName;
    private Integer sno;
    private String accessoryName;
    private String qty;
    private String rate;
    private String amount;
}
package com.garment.DTO;

import lombok.Data;

@Data
public class SizeDetailModalResponseDTO {
    private Long id;
    private String serialNo;
    private String sizeName;
    private String orderNo;
    private String box;
    private String pcs;
    private String rate;
}
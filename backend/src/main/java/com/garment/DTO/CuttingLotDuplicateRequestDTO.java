package com.garment.DTO;

import java.util.List;

import lombok.Data;

@Data
public class CuttingLotDuplicateRequestDTO {
    private String serialNo;
    private List<String> lotNos;
}

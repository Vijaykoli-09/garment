package com.garment.DTO;

import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class KnittingMaterialReturnDTO {
    private Long id; // optional for update
    private LocalDate date;
    private Long partyId;
    private String challanNo;
    private List<KnittingMaterialReturnRowDTO> items;
}

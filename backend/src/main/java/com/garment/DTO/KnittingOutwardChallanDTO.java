package com.garment.DTO;

import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class KnittingOutwardChallanDTO {
    private LocalDate date;
    private Long partyId;
    private String challanNo;
    private List<KnittingOutwardChallanRowDTO> items;
}

package com.garment.DTO;

import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class KnittingMaterialReturnDTO {

    private Long id;

    private LocalDate date;

    // Required Material Party
    private Long partyId;

    // Optional Received Return Party
    private Long receivedPartyId;

    private String challanNo;

    private List<KnittingMaterialReturnRowDTO> items;
}
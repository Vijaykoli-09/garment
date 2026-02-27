package com.garment.DTO;


import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FinishingOutwardDTO {

    private Long id; // Included for updates/retrieval
    private String challanNo;
    private LocalDate dated;
    private String partyName;
    private String narration;
    private String vehicleNo;
    private String through;

    // Contains the list of detail DTOs
    private List<FinishingOutwardRowDTO> rows;
}
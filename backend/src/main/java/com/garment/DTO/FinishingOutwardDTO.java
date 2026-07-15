package com.garment.DTO;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class FinishingOutwardDTO {

    private Long id;
    private String challanNo;
    private LocalDate dated;
    private String partyName;
    private String narration;
    private String vehicleNo;
    private String through;

    private List<FinishingOutwardRowDTO> rows;
}
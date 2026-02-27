package com.garment.DTO;

import lombok.*;
import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FinishingInwardDTO {
    private Long id;
    private String challanNo;
    private LocalDate dated;
    private String partyName;
    private String vehicleNo;
    private String through;
    private List<FinishingInwardRowDTO> rows;
}

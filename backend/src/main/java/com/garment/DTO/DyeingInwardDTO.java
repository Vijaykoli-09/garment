package com.garment.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DyeingInwardDTO {
    private Long id;
    private String dated;
    private String partyName;
    private String challanNo;
    private Boolean transferToStock;
    private String vehicleNo;
    private String through;
    private String narration;
    private List<DyeingInwardRowDTO> rows = new ArrayList<>();
}
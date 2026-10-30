package com.garment.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DyeingOutwardListDTO {
    private Long id;
    private String challanNo;
    private String dated;
    private String partyName;
}

package com.garment.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProcessDTO {
    private Long id;
    private Integer sno;
    private String processName;
    private String rate;
    private String rate1;
    private String sizeWid;
    private String sizeWidAct;
    private String itemRef;
    private String process;
}
package com.garment.DTO;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PackingChallanListDTO {
    private String serialNo;
    private LocalDate date;
    private String partyName;
    private Integer totalBox;
    private Integer totalPcs;
    private BigDecimal totalAmount;
    private String artNumbers;
    private String cuttingLotNumbers;
    private String sizeNames; // retained for backward compatibility
    private List<PackingChallanListSizeDTO> sizeDetails;

    // Keeps the existing JPQL constructor projection compatible.
    public PackingChallanListDTO(String serialNo, LocalDate date, String partyName,
                                 Integer totalBox, Integer totalPcs, BigDecimal totalAmount) {
        this.serialNo = serialNo;
        this.date = date;
        this.partyName = partyName;
        this.totalBox = totalBox;
        this.totalPcs = totalPcs;
        this.totalAmount = totalAmount;
    }
}

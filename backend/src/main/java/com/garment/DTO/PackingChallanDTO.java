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
public class PackingChallanDTO {
	  private String serialNo;   // read-only for UI (server fills)
	  private LocalDate date;
	  private Long partyId;
	  private String partyName;

	  private Integer totalBox;
	  private Integer totalPcs;
	  private BigDecimal totalAmount;

	  private List<PackingChallanRowDTO> rows;
}

package com.garment.DTO;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AmountReportRequestDTO {
	private Long partyId;
    private String fromDate;
    private String toDate;
}

package com.garment.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AmountReportResponseDTO {
	private String date;
    private String narration;
    private Double debit;   // Purchase Order Amount
    private Double credit;  // Purchase Entry Amount
    private Double balance;
}

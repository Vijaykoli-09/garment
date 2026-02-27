package com.garment.DTO;

import java.time.LocalDate;
import java.util.List;

import lombok.Data;

@Data
public class MaterialStockRequestDTO {
	 private List<Long> groupIds;  // Selected Material Group IDs
	 private List<Long> itemIds;   // Selected Material Item IDs
	 private String fromDate; // ✅ New
	 private String toDate;   // ✅ New
}

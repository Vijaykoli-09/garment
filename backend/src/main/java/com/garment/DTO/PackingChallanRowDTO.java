package com.garment.DTO;

import java.math.BigDecimal;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data 
@NoArgsConstructor 
@AllArgsConstructor
public class PackingChallanRowDTO {
	private Long id;
	  private Integer sno;

	  private String cuttingLotNo;
	  private String artNo;
	  private String workOnArt;

	  private String artGroupName; // derived (server), shown as read-only

	  /**
	   * @deprecated replaced by sizeDetails list
	   */
	  private Long sizeId;
	  
	  /**
	   * @deprecated replaced by sizeDetails list
	   */
	  private String sizeName;

	  //New Added
	  private List<PackingChallanSizeDetailDTO> sizeDetails;

	  private String shadeCode;
	  private String shadeName;

	  private Integer box;
	  private Integer perBox;
	  private Integer pcs;
	  private BigDecimal rate;
	  private BigDecimal amount;
}

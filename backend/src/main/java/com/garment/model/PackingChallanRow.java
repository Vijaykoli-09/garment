package com.garment.model;

import jakarta.persistence.Index;
import lombok.ToString;
import lombok.EqualsAndHashCode;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity 
@Table(name="packing_challan_rows", indexes = {
		@Index(name = "idx_pcr_challan_serial", columnList = "challan_serial_no"),
		@Index(name = "idx_pcr_art_no", columnList = "art_no"),
		@Index(name = "idx_pcr_cut_lot_no", columnList = "cut_lot_no"),
		@Index(name = "idx_pcr_work_on_art", columnList = "work_on_art")
})
@Data 
@NoArgsConstructor 
@AllArgsConstructor
public class PackingChallanRow {
	  @Id 
	  @GeneratedValue(strategy = GenerationType.IDENTITY)
	  private Long id;

	  @Column(name="sno") 
	  private Integer sno;

	  @Column(name="cut_lot_no")   
	  private String cuttingLotNo; // from Cutting Lot
	  @Column(name="art_no")       
	  private String artNo;        // from Cutting Lot
	  @Column(name="work_on_art")  
	  private String workOnArt;    // from Cutting Lot

	  @Column(name="art_group_name") 
	  private String artGroupName; // derived from Art, frozen text

	  /**
	   * @deprecated replaced by {@link #sizeDetails}
	   */
	  @Deprecated
	  @ManyToOne(fetch = FetchType.LAZY)
	  @JoinColumn(name="size_id")
	  @ToString.Exclude @EqualsAndHashCode.Exclude
	  private Size size;


	  @OneToMany(mappedBy = "row", cascade = CascadeType.ALL, orphanRemoval = true)
	  @OrderBy("id ASC")
	  @ToString.Exclude @EqualsAndHashCode.Exclude
	  private List<PackingChallanSizeDetail> sizeDetails = new ArrayList<>();

	  @ManyToOne(fetch = FetchType.LAZY)
	  @JoinColumn(name="shade_code", referencedColumnName = "shade_code")
	  @ToString.Exclude @EqualsAndHashCode.Exclude
	  private Shade shade;

	  @Column(name="box")     
	  private Integer boxCount;
	  @Column(name="per_box") 
	  private Integer perBox;

	  @Column(name="pcs")     
	  private Integer pcs;                         // auto: box*perBox
	  @Column(name="rate",   precision=12, scale=2) 
	  private BigDecimal rate;   // prefill last
	  @Column(name="amount", precision=14, scale=2) 
	  private BigDecimal amount; // pcs*rate

	  @ManyToOne(fetch = FetchType.LAZY)
	  @JoinColumn(name="challan_serial_no")
	  @ToString.Exclude @EqualsAndHashCode.Exclude
	  private PackingChallan challan;
}
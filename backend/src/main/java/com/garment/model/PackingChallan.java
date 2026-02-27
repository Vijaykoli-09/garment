package com.garment.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity 
@Table(name="packing_challans")
@Data 
@NoArgsConstructor 
@AllArgsConstructor
public class PackingChallan {
	  @Id
	  @Column(name="serial_no", length=32, nullable=false, unique=true)
	  private String serialNo;               // server-generated, not shown in UI

	  @Column(name="dated") 
	  private LocalDate date;

	  @ManyToOne(fetch = FetchType.LAZY) 
	  @JoinColumn(name="party_id")
	  private Party party;
	  
	  @Column(name="party_name") 
	  private String partyName; // denormalized

	  @Column(name="total_box")    
	  private Integer totalBox;
	  @Column(name="total_pcs")    
	  private Integer totalPcs;
	  @Column(name="total_amount", precision=14, scale=2) 
	  private BigDecimal totalAmount;

	  @Column(name="created_at") 
	  private LocalDateTime createdAt;
	  @Column(name="updated_at") 
	  private LocalDateTime updatedAt;

	  @OneToMany(mappedBy="challan", cascade=CascadeType.ALL, orphanRemoval=true)
	  @OrderBy("sno asc")
	  private List<PackingChallanRow> rows = new ArrayList<>();

	  @PrePersist 
	  void onCreate(){ createdAt = updatedAt = LocalDateTime.now(); }
	  @PreUpdate  
	  void onUpdate(){ updatedAt = LocalDateTime.now(); }

	  public void addRow(PackingChallanRow r){ rows.add(r); r.setChallan(this); }
}

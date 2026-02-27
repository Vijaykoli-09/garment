package com.garment.model;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.*;
import lombok.*;
import lombok.NoArgsConstructor;


@Entity
@Table(name = "finishing_outward")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FinishingOutward {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "challan_no", unique = true)
    private String challanNo;
    
    @Column(name = "dated")
    private LocalDate dated;
    
    @Column(name = "party_name")
    private String partyName;
    
    @Column(name = "narration")
    private String narration;
    
    @Column(name = "vehicle_no")
    private String vehicleNo;
    
    @Column(name = "through")
    private String through;
    
    @OneToMany(mappedBy = "finishingOutward", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FinishingOutwardRow> rows = new ArrayList<>();
    
    public void addRow(FinishingOutwardRow row) {
        rows.add(row);
        row.setFinishingOutward(this);
    }
    
    public void removeRow(FinishingOutwardRow row) {
        rows.remove(row);
        row.setFinishingOutward(null);
    }
    
}



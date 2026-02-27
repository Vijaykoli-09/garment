package com.garment.model;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.*;
import lombok.*;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "finishing_inward")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FinishingInward {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "challan_no", unique = true)
    private String challanNo;

    @Column(name = "dated")
    private LocalDate dated;

    @Column(name = "party_name")
    private String partyName;

    @Column(name = "vehicle_no")
    private String vehicleNo;

    @Column(name = "through")
    private String through;

    @OneToMany(mappedBy = "finishingInward", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FinishingInwardRow> rows = new ArrayList<>();

    public void addRow(FinishingInwardRow row) {
        rows.add(row);
        row.setFinishingInward(this);
    }
    public void removeRow(FinishingInwardRow row) {
        rows.remove(row);
        row.setFinishingInward(null);
    }

}

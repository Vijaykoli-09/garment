package com.garment.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "dyeing_inward")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DyeingInward {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "dated")
    private LocalDate dated;

    @Column(name = "party_name")
    private String partyName;

    @Column(name = "challan_no")
    private String challanNo;

    @Column(name = "transfer_to_stock")
    private Boolean transferToStock;

    @Column(name = "vehicle_no")
    private String vehicleNo;

    @Column(name = "through")
    private String through;

    @Column(name = "narration", columnDefinition = "TEXT")
    private String narration;

    @OneToMany(mappedBy = "dyeingInward", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DyeingInwardRow> rows = new ArrayList<>();

    public void addRow(DyeingInwardRow row) {
        rows.add(row);
        row.setDyeingInward(this);
    }

    public void removeRow(DyeingInwardRow row) {
        rows.remove(row);
        row.setDyeingInward(null);
    }
}
package com.garment.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "job_inward_challan")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobInwardChallan {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // store as date
    private LocalDate date;

    @Column(name = "challan_no", nullable = false, unique = true)
    private String challanNo;

    // FK to party table (just store id)
    private Long partyId;

    // processId is a serialNo (string)
    private String processId;

    // header art (serial or text)
    private String artHeader;

    private String remarks;
    private String adjustLot;

    @OneToMany(mappedBy = "inwardChallan", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("seq ASC")
    private List<JobInwardChallanRow> rows = new ArrayList<>();
}

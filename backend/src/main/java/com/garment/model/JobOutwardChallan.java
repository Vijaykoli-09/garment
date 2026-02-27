package com.garment.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Entity
@Table(name = "job_outward_challan")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@NoArgsConstructor
@AllArgsConstructor
public class JobOutwardChallan {
    @Id
    @Column(name = "serial_no", nullable = false, unique = true, length = 32)
    private String serialNo;

    @Column(name = "order_challan_no")
    private String orderChallanNo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "party_id")
    private Party party;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "process_id", referencedColumnName = "serialNo")
    private Process process;

    @Column(name = "dated")
    private LocalDate date;

    @Column(name = "remarks1")
    private String remarks1;

    @Column(name = "remarks2")
    private String remarks2;

    @OneToMany(mappedBy = "jobOutwardChallan", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<JobOutwardChallanRow> rows = new ArrayList<>();

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void addRow(JobOutwardChallanRow r) {
        rows.add(r);
        r.setJobOutwardChallan(this);
    }
}

package com.garment.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Entity
@Table(name = "cutting_entries")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CuttingEntry {

    @Id
    @Column(name = "serial_no", nullable = false, unique = true, length = 32)
    private String serialNo;

    @Column(name = "dated")
    private LocalDate date;

    @Column(name = "employee_id")
    private String employeeId;

    @Column(name = "employee_name")
    private String employeeName;

    @Column(name = "total_pcs")
    private String totalPcs;

    @Column(name = "total_cutting_amount")
    private String totalCuttingAmount;

    @Column(name = "total_consumption")
    private String totalConsumption;

    @Column(name = "total_kho")
    private String totalKho;

    @Column(name = "total_cons_amount")
    private String totalConsAmount;

    // NEW: Issue To + Branch
    @Column(name = "issue_to", length = 16)
    private String issueTo; // "Inside" | "Outside"

    @Column(name = "issue_branch_id")
    private Long issueBranchId; // Location ID

    @Column(name = "issue_branch_name")
    private String issueBranchName; // Branch name snapshot

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "cuttingEntry", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CuttingLotRow> lotRows = new ArrayList<>();

    @OneToMany(mappedBy = "cuttingEntry", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CuttingStockRow> stockRows = new ArrayList<>();

    @PrePersist
    public void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void addLotRow(CuttingLotRow r) {
        lotRows.add(r);
        r.setCuttingEntry(this);
    }
    public void addStockRow(CuttingStockRow r) {
        stockRows.add(r);
        r.setCuttingEntry(this);
    }
}
package com.garment.model;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "order_settles")
@Data
@NoArgsConstructor
public class OrderSettle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "challan_no", length = 50)
    private String challanNo;

    @Column(name = "dated")
    private LocalDate dated;

    @Column(name = "party_id")
    private Long partyId;             // optional

    @Column(name = "party_name", length = 200)
    private String partyName;

    @Column(name = "broker", length = 200)
    private String broker;

    @Column(name = "transport", length = 200)
    private String transport;

    @Column(name = "remarks1", length = 300)
    private String remarks1;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "settle", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id asc")
    private List<OrderSettleRow> rows = new ArrayList<>();

    @PrePersist
    void onCreate(){ createdAt = updatedAt = LocalDateTime.now(); }

    @PreUpdate
    void onUpdate(){ updatedAt = LocalDateTime.now(); }

    public void addRow(OrderSettleRow r){
        rows.add(r);
        r.setSettle(this);
    }
}
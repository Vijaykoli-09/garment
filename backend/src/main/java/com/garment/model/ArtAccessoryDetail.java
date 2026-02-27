package com.garment.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "art_accessory_details")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ArtAccessoryDetail {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "process_name")
    private String processName;
    
    @Column(name = "sno")
    private Integer sno;
    
    @Column(name = "accessory_name")
    private String accessoryName;
    
    @Column(name = "qty")
    private String qty;
    
    @Column(name = "rate")
    private String rate;
    
    @Column(name = "amount")
    private String amount;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "art_serial_number", nullable = false)
    @JsonIgnore
    private Art art;
}
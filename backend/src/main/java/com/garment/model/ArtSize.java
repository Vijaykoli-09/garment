package com.garment.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "art_sizes")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ArtSize {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "art_serial_number", nullable = false)
    @JsonIgnore
    private Art art;
    
    @Column(name = "serial_no")
    private String serialNo;
    
    @Column(name = "size_name")
    private String sizeName;
    
    @Column(name = "order_no")
    private String orderNo;
    
    @Column(name = "art_group")
    private String artGroup;
}
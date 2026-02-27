package com.garment.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "art_processes")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ArtProcess {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "art_serial_number", nullable = false)
    @JsonIgnore
    private Art art;
    
    @Column(name = "sno")
    private Integer sno;
    
    @Column(name = "process_name")
    private String processName;
    
    @Column(name = "rate")
    private String rate;
    
    @Column(name = "rate1")
    private String rate1;
    
    @Column(name = "size_wid")
    private String sizeWid;
    
    @Column(name = "size_wid_act")
    private String sizeWidAct;
    
    @Column(name = "item_ref")
    private String itemRef;
    
    @Column(name = "process")
    private String process;
}
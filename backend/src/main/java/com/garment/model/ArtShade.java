package com.garment.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "art_shades")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ArtShade {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "art_serial_number", nullable = false)
    @JsonIgnore
    private Art art;
    
    @Column(name = "shade_code")
    private String shadeCode;
    
    @Column(name = "shade_name")
    private String shadeName;
    
    @Column(name = "color_family")
    private String colorFamily;
}
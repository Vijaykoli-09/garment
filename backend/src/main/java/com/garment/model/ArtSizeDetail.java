package com.garment.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "art_size_details")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ArtSizeDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "serial_no")
    private String serialNo;

    @Column(name = "size_name")
    private String sizeName;

    @Column(name = "order_no")
    private String orderNo;

    @Column(name = "box")
    private String box;

    @Column(name = "pcs")
    private String pcs;

    @Column(name = "rate")
    private String rate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "art_serial_number", nullable = false)
    private Art art;
}
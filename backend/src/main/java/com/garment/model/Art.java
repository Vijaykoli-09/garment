package com.garment.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "arts")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Art {

    @Id
    @Column(name = "serial_number", nullable = false, unique = true)
    private String serialNumber;

    @Column(name = "art_group")
    private String artGroup;

    @Column(name = "art_name", nullable = false)
    private String artName;

    @Column(name = "art_no")
    private String artNo;

    @Column(name = "copy_from_art_name")
    private String copyFromArtName;

    @Column(name = "style_rate")
    private String styleRate;

    @Column(name = "sale_rate")
    private String saleRate;

    @Column(name = "style_name")
    private String styleName;

    @Column(name = "season")
    private String season;

    @Column(name = "opening_balance")
    private String openingBalance;

    @Column(name = "wt_pcs")
    private String wtPcs;

    @Column(name = "reference")
    private String reference;

    @Column(name = "brand_name")
    private String brandName;

    @Column(name = "work_on_art")
    private String workOnArt;

    @Column(name = "rate_total")
    private String rateTotal;

    @OneToMany(mappedBy = "art", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ArtProcess> processes = new ArrayList<>();

    @OneToMany(mappedBy = "art", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ArtShade> shades = new ArrayList<>();

    @OneToMany(mappedBy = "art", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ArtSize> sizes = new ArrayList<>();

    @OneToMany(mappedBy = "art", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ArtSizeDetail> sizeDetails = new ArrayList<>();

    @OneToMany(mappedBy = "art", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ArtAccessory> accessories = new ArrayList<>();

    @OneToMany(mappedBy = "art", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ArtAccessoryDetail> accessoryDetails = new ArrayList<>();
}
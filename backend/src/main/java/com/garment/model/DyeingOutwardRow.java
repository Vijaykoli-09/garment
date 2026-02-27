package com.garment.model;


import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


@Entity
@Table(name = "dyeing_outward_row")
@Getter
@Setter
@NoArgsConstructor
public class DyeingOutwardRow {
@Id
@GeneratedValue(strategy = GenerationType.IDENTITY)
private Long id;


private String lotNo;
private String fabricName;
private String shade;
private String mcSize;
private String greyGSM;
private String regdSize;
private String processing;
private String roll;
private String weight;
private String knittingYarnRate;
private String rate;
private String amount;
}
package com.garment.model;


import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


import java.util.ArrayList;
import java.util.List;


@Entity
@Table(name = "dyeing_outward")
@Getter
@Setter
@NoArgsConstructor
public class DyeingOutward {
@Id
@GeneratedValue(strategy = GenerationType.IDENTITY)
private Long id;


private String challanNo;
private String dated; // stored as ISO date string to match frontend input (yyyy-MM-dd)
private String partyName;
private String narration;
private String vehicleNo;
private String through;


@OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
@JoinColumn(name = "dyeing_outward_id")
private List<DyeingOutwardRow> rows = new ArrayList<>();
}
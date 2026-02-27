package com.garment.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "agents")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Agent {

    @Id
    @Column(unique = true, nullable = false)
    private String serialNo;  // Primary Key

    @Column(nullable = false)
    private String agentName;

    private String contactNo;
    private String email;
    private String address;
    private String city;
    private String state;
    private String zipCode;
}

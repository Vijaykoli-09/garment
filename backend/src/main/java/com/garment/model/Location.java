package com.garment.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "locations",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_location_serial_number", columnNames = "serial_number")
        },
        indexes = {
                @Index(name = "idx_location_branch", columnList = "branch_name"),
                @Index(name = "idx_location_station", columnList = "station")
        }
)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Location {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "serial_number", nullable = false, length = 20)
    private String serialNumber;

    @Column(name = "branch_name", nullable = false, length = 150)
    private String branchName;

    @Column(name = "branch_code", length = 50)
    private String branchCode;

    @Column(name = "station", nullable = false, length = 100)
    private String station;

    @Column(name = "state_name", length = 100)
    private String stateName;

    @Column(name = "address", length = 500)
    private String address;

    @Column(name = "pin_code", length = 20)
    private String pinCode;

    @Column(name = "phone", length = 50)
    private String phone;

    @Column(name = "email", length = 150)
    private String email;

    @Column(name = "transport_name", length = 150)
    private String transportName;

    @Column(name = "active")
    private Boolean active;

    @Column(name = "remarks", length = 500)
    private String remarks;
}
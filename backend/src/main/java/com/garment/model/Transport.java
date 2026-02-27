package com.garment.model;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "transports")
public class Transport {

    @Id
    @Column(name = "serial_number", nullable = false, unique = true)
    private String serialNumber;

    // @Column(name = "transport_code", unique = true, nullable = false)
    // private String transportCode;

    @Column(name = "transport_name", nullable = false)
    private String transportName;

    private String mobile;
    private String email;

    private String gstNo;
    private String city;
    private String state;
    private String pincode;
    private String address;
    private String remarks;

}


// @Column(name = "vehicle_no")
// private String vehicleNo;

// @Column(name = "license_no")
// private String licenseNo;

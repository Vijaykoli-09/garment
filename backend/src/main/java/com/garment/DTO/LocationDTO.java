package com.garment.DTO;


import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LocationDTO {
    private Long id;
    private String serialNumber;

    @NotBlank(message = "Branch Name is required")
    private String branchName;

    private String branchCode;

    @NotBlank(message = "Station (City) is required")
    private String station;

    private String stateName;
    private String address;
    private String pinCode;
    private String phone;

    @Email(message = "Email must be valid")
    private String email;

    private String transportName;
    private Boolean active = Boolean.TRUE;
    private String remarks;
}
package com.garment.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "ranges")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Range {

    @Id
    @Column(name = "serial_number", nullable = false, unique = true)
    private String serialNumber;

    @Column(name = "range_name", nullable = false)
    private String rangeName;


    @Column(name = "start_value", nullable = false)
    private String startValue;

    @Column(name = "end_value", nullable = false)
    private String endValue;

   
}

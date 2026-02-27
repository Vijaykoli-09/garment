package com.garment.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Data
@Entity
@Table(name = "processes")
public class Process {

    @Id
    private String serialNo; // Using serialNo as PK

    private String processName;
   

    public Process() {
    }

    public Process(String serialNo, String processName, String category) {
        this.serialNo = serialNo;
        this.processName = processName;
       
    }

    public String getSerialNo() {
        return serialNo;
    }

    public void setSerialNo(String serialNo) {
        this.serialNo = serialNo;
    }

    public String getProcessName() {
        return processName;
    }

    public void setProcessName(String processName) {
        this.processName = processName;
    }

   
}

package com.garment.DTO;

import java.util.ArrayList;
import java.util.List;

public class ProductionReceiptArtDetailDTO {

    private String serialNumber;
    private String artNo;
    private String artName;
    private List<ProcessRateDTO> processes = new ArrayList<>();

    public ProductionReceiptArtDetailDTO() {
    }

    public ProductionReceiptArtDetailDTO(String serialNumber, String artNo, String artName) {
        this.serialNumber = serialNumber;
        this.artNo = artNo;
        this.artName = artName;
    }

    public String getSerialNumber() {
        return serialNumber;
    }

    public void setSerialNumber(String serialNumber) {
        this.serialNumber = serialNumber;
    }

    public String getArtNo() {
        return artNo;
    }

    public void setArtNo(String artNo) {
        this.artNo = artNo;
    }

    public String getArtName() {
        return artName;
    }

    public void setArtName(String artName) {
        this.artName = artName;
    }

    public List<ProcessRateDTO> getProcesses() {
        return processes;
    }

    public void setProcesses(List<ProcessRateDTO> processes) {
        this.processes = processes;
    }

    public static class ProcessRateDTO {
        private String processName;
        private String rate;

        public ProcessRateDTO() {
        }

        public ProcessRateDTO(String processName, String rate) {
            this.processName = processName;
            this.rate = rate;
        }

        public String getProcessName() {
            return processName;
        }

        public void setProcessName(String processName) {
            this.processName = processName;
        }

        public String getRate() {
            return rate;
        }

        public void setRate(String rate) {
            this.rate = rate;
        }
    }
}

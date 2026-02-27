package com.garment.DTO;

public class ArtDTO {

    // Request DTO (used for creating/updating an art)
    public static class Request {
        private String serialNumber;
        private String artGroup;
        private String artName;
        private String artNo;
        private String styleRate;
        private String styleName;
        private String season;
        private String copyFromArtName;
        private String openingBalance;
        private String wtPcs;
        private String reference;
        private String brandName;
        private String workOnArt;

        // Getters and Setters
        public String getSerialNumber() { return serialNumber; }
        public void setSerialNumber(String serialNumber) { this.serialNumber = serialNumber; }

        public String getArtGroup() { return artGroup; }
        public void setArtGroup(String artGroup) { this.artGroup = artGroup; }

        public String getArtName() { return artName; }
        public void setArtName(String artName) { this.artName = artName; }

        public String getArtNo() { return artNo; }
        public void setArtNo(String artNo) { this.artNo = artNo; }

        public String getStyleRate() { return styleRate; }
        public void setStyleRate(String styleRate) { this.styleRate = styleRate; }

        public String getStyleName() { return styleName; }
        public void setStyleName(String styleName) { this.styleName = styleName; }

        public String getSeason() { return season; }
        public void setSeason(String season) { this.season = season; }

        public String getCopyFromArtName() { return copyFromArtName; }
        public void setCopyFromArtName(String copyFromArtName) { this.copyFromArtName = copyFromArtName; }

        public String getOpeningBalance() { return openingBalance; }
        public void setOpeningBalance(String openingBalance) { this.openingBalance = openingBalance; }

        public String getWtPcs() { return wtPcs; }
        public void setWtPcs(String wtPcs) { this.wtPcs = wtPcs; }

        public String getReference() { return reference; }
        public void setReference(String reference) { this.reference = reference; }

        public String getBrandName() { return brandName; }
        public void setBrandName(String brandName) { this.brandName = brandName; }

        public String getWorkOnArt() { return workOnArt; }
        public void setWorkOnArt(String workOnArt) { this.workOnArt = workOnArt; }
    }

    // ListView DTO (used for displaying limited fields in table/list)
    public static class ListView {
        private String serialNumber;
        private String artGroup;
        private String artName;
        private String artNo;
        private String styleName;
        private String season;
        private String brandName;

        // Constructor
        public ListView(String serialNumber, String artGroup, String artName, 
                       String artNo, String styleName, String season, String brandName) {
            this.serialNumber = serialNumber;
            this.artGroup = artGroup;
            this.artName = artName;
            this.artNo = artNo;
            this.styleName = styleName;
            this.season = season;
            this.brandName = brandName;
        }

        // Getters and Setters
        public String getSerialNumber() { return serialNumber; }
        public void setSerialNumber(String serialNumber) { this.serialNumber = serialNumber; }

        public String getArtGroup() { return artGroup; }
        public void setArtGroup(String artGroup) { this.artGroup = artGroup; }

        public String getArtName() { return artName; }
        public void setArtName(String artName) { this.artName = artName; }

        public String getArtNo() { return artNo; }
        public void setArtNo(String artNo) { this.artNo = artNo; }

        public String getStyleName() { return styleName; }
        public void setStyleName(String styleName) { this.styleName = styleName; }

        public String getSeason() { return season; }
        public void setSeason(String season) { this.season = season; }

        public String getBrandName() { return brandName; }
        public void setBrandName(String brandName) { this.brandName = brandName; }
    }

    // DetailView DTO (used for edit/update with all fields)
    public static class DetailView {
        private String serialNumber;
        private String artGroup;
        private String artName;
        private String artNo;
        private String styleRate;
        private String styleName;
        private String season;
        private String copyFromArtName;
        private String openingBalance;
        private String wtPcs;
        private String reference;
        private String brandName;
        private String workOnArt;

        // Constructor with all fields
        public DetailView(String serialNumber, String artGroup, String artName, String artNo,
                         String styleRate, String styleName, String season,
                         String copyFromArtName, String openingBalance, String wtPcs,
                         String reference, String brandName, String workOnArt) {
            this.serialNumber = serialNumber;
            this.artGroup = artGroup;
            this.artName = artName;
            this.artNo = artNo;
            this.styleRate = styleRate;
            this.styleName = styleName;
            this.season = season;
            this.copyFromArtName = copyFromArtName;
            this.openingBalance = openingBalance;
            this.wtPcs = wtPcs;
            this.reference = reference;
            this.brandName = brandName;
            this.workOnArt = workOnArt;
        }

        // Getters and Setters
        public String getSerialNumber() { return serialNumber; }
        public void setSerialNumber(String serialNumber) { this.serialNumber = serialNumber; }

        public String getArtGroup() { return artGroup; }
        public void setArtGroup(String artGroup) { this.artGroup = artGroup; }

        public String getArtName() { return artName; }
        public void setArtName(String artName) { this.artName = artName; }

        public String getArtNo() { return artNo; }
        public void setArtNo(String artNo) { this.artNo = artNo; }

        public String getStyleRate() { return styleRate; }
        public void setStyleRate(String styleRate) { this.styleRate = styleRate; }

        public String getStyleName() { return styleName; }
        public void setStyleName(String styleName) { this.styleName = styleName; }

        public String getSeason() { return season; }
        public void setSeason(String season) { this.season = season; }

        public String getCopyFromArtName() { return copyFromArtName; }
        public void setCopyFromArtName(String copyFromArtName) { this.copyFromArtName = copyFromArtName; }

        public String getOpeningBalance() { return openingBalance; }
        public void setOpeningBalance(String openingBalance) { this.openingBalance = openingBalance; }

        public String getWtPcs() { return wtPcs; }
        public void setWtPcs(String wtPcs) { this.wtPcs = wtPcs; }

        public String getReference() { return reference; }
        public void setReference(String reference) { this.reference = reference; }

        public String getBrandName() { return brandName; }
        public void setBrandName(String brandName) { this.brandName = brandName; }

        public String getWorkOnArt() { return workOnArt; }
        public void setWorkOnArt(String workOnArt) { this.workOnArt = workOnArt; }
    }
}
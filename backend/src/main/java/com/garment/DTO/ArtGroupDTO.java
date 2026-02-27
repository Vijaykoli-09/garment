package com.garment.DTO;

public class ArtGroupDTO {
    private String serialNo;
    private String artGroupName;
    private String seriesRangeStart;
    private String seriesRangeEnd;

    public ArtGroupDTO() {}

    public ArtGroupDTO(String serialNo, String artGroupName,  String seriesRangeStart, String seriesRangeEnd) {
        this.serialNo = serialNo;
        this.artGroupName = artGroupName;
        this.seriesRangeStart = seriesRangeStart;
        this.seriesRangeEnd = seriesRangeEnd;
    }

    // ✅ Getters & Setters
    public String getSerialNo() {
        return serialNo;
    }

    public void setSerialNo(String serialNo) {
        this.serialNo = serialNo;
    }

    public String getArtGroupName() {
        return artGroupName;
    }

    public void setArtGroupName(String artGroupName) {
        this.artGroupName = artGroupName;
    }

   

    public String getSeriesRangeStart() {
        return seriesRangeStart;
    }

    public void setSeriesRangeStart(String seriesRangeStart) {
        this.seriesRangeStart = seriesRangeStart;
    }

    public String getSeriesRangeEnd() {
        return seriesRangeEnd;
    }

    public void setSeriesRangeEnd(String seriesRangeEnd) {
        this.seriesRangeEnd = seriesRangeEnd;
    }
}

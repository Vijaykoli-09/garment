package com.garment.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "art_groups")
public class ArtGroup {

    @Id
    @Column(name = "serial_no", length = 100)
    private String serialNo;

    @Column(name = "art_group_name", nullable = false)
    private String artGroupName;

    @Column(name = "series_range_start")
    private String seriesRangeStart;

    @Column(name = "series_range_end")
    private String seriesRangeEnd;

    public ArtGroup() {}

    public ArtGroup(String serialNo, String artGroupName, String seriesRangeStart, String seriesRangeEnd) {
        this.serialNo = serialNo;
        this.artGroupName = artGroupName;
        this.seriesRangeStart = seriesRangeStart;
        this.seriesRangeEnd = seriesRangeEnd;
    }

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

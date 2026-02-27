package com.garment.model;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "sizes")
public class Size {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "serial_no", nullable = false, unique = true)
    private String serialNo;

    @Column(name = "size_name", nullable = false)
    private String sizeName;


    @ManyToOne()
    @JoinColumn(name = "art_group_serial_no")
    private ArtGroup artGroup;

   

    // Getters & Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    


    public String getSerialNo() {
		return serialNo;
	}

	public void setSerialNo(String serialNo) {
		this.serialNo = serialNo;
	}

	public String getSizeName() {
        return sizeName;
    }

    public void setSizeName(String sizeName) {
        this.sizeName = sizeName;
    }

   
    public ArtGroup getArtGroup() {
        return artGroup;
    }

    public void setArtGroup(ArtGroup artGroup) {
        this.artGroup = artGroup;
    }

    // public String getArtName() { return artName; }
    // public void setArtName(String artName) { this.artName = artName; }

    // public String getSizeGroup() { return sizeGroup; }

    // public void setSizeGroup(String sizeGroup) {
    //     this.sizeGroup = sizeGroup;
    // }

}

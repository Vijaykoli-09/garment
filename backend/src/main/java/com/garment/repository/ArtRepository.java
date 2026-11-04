package com.garment.repository;

import java.util.List;
import org.springframework.data.jpa.repository.Query;
import com.garment.model.Art;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ArtRepository extends JpaRepository<Art, String> {
    Optional<Art> findBySerialNumber(String serialNumber);
    boolean existsBySerialNumber(String serialNumber);
    Optional<Art> findFirstByArtNo(String artNo);

    // ---- Slim projections for stock screens (one query each, no entity graphs) ----
    interface ArtBasicRow { String getSerialNumber(); String getArtNo(); String getArtName(); }
    interface ArtShadeRow { String getArtSerial(); String getShadeName(); }
    interface ArtSizeRow { String getArtSerial(); String getSizeName(); }
    interface ArtSizeDetailRow { String getArtSerial(); String getSizeName(); String getBox(); String getPcs(); }

    @Query("select a.serialNumber as serialNumber, a.artNo as artNo, a.artName as artName from Art a order by a.serialNumber")
    List<ArtBasicRow> findAllBasicRows();

    @Query("select s.art.serialNumber as artSerial, s.shadeName as shadeName from ArtShade s order by s.id")
    List<ArtShadeRow> findAllShadeRows();

    @Query("select s.art.serialNumber as artSerial, s.sizeName as sizeName from ArtSize s order by s.id")
    List<ArtSizeRow> findAllSizeRows();

    @Query("select s.art.serialNumber as artSerial, s.sizeName as sizeName, s.box as box, s.pcs as pcs from ArtSizeDetail s order by s.id")
    List<ArtSizeDetailRow> findAllSizeDetailRows();
}
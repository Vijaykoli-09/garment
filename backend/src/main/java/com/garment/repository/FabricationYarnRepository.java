package com.garment.repository;

import com.garment.model.Fabrication;
import com.garment.model.FabricationYarn;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FabricationYarnRepository extends JpaRepository<FabricationYarn, Long> {
    List<FabricationYarn> findByFabrication(Fabrication fabrication); // ✅ new method
}

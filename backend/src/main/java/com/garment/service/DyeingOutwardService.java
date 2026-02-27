package com.garment.service;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import com.garment.model.DyeingOutward;
import com.garment.model.DyeingOutwardRow;
import com.garment.repository.DyeingOutwardRepository;

import java.util.List;
import java.util.Optional;


@Service
@Transactional
public class DyeingOutwardService {
private final DyeingOutwardRepository repository;


public DyeingOutwardService(DyeingOutwardRepository repository) {
this.repository = repository;
}


public DyeingOutward save(DyeingOutward dto) {
// because of cascade = ALL, saving parent will persist rows
return repository.save(dto);
}


public DyeingOutward update(Long id, DyeingOutward updated) {
// No explicit exception handling per your request. This will throw if not found.
DyeingOutward existing = repository.findById(id).get();


existing.setChallanNo(updated.getChallanNo());
existing.setDated(updated.getDated());
existing.setPartyName(updated.getPartyName());
existing.setNarration(updated.getNarration());
existing.setVehicleNo(updated.getVehicleNo());
existing.setThrough(updated.getThrough());


// Replace rows: clear existing and add from updated
existing.getRows().clear();
if (updated.getRows() != null) {
for (DyeingOutwardRow r : updated.getRows()) {
// ensure id null so JPA will insert as new rows
r.setId(null);
existing.getRows().add(r);
}
}


return repository.save(existing);
}


public List<DyeingOutward> findAll() {
return repository.findAll();
}


public Optional<DyeingOutward> findById(Long id) {
return repository.findById(id);
}


public void delete(Long id) {
repository.deleteById(id);
}
}
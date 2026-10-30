package com.garment.service;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import com.garment.DTO.DyeingOutwardListDTO;
import com.garment.model.DyeingOutward;
import com.garment.model.DyeingOutwardRow;
import com.garment.repository.DyeingOutwardRepository;

import java.util.List;
import java.util.Locale;
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

public Page<DyeingOutwardListDTO> findAllPaged(int page, int size, String search) {
int safePage = Math.max(0, page);
int safeSize = Math.max(1, Math.min(size, 100));
String query = "%" + (search == null ? "" : search.trim().toLowerCase(Locale.ROOT)) + "%";
return repository.searchPaged(query, PageRequest.of(safePage, safeSize))
        .map(row -> new DyeingOutwardListDTO(
                row.getId(), row.getChallanNo(), row.getDated(), row.getPartyName()));
}

public List<String> findIssuedSourceKeys(Long excludeId) {
return repository.findIssuedSourceKeys(excludeId);
}

public List<String> findPreviouslyIssuedLots(List<String> lotNos) {
if (lotNos == null || lotNos.isEmpty()) return List.of();
List<String> normalizedLots = lotNos.stream()
        .filter(lot -> lot != null && !lot.isBlank())
        .map(lot -> lot.trim().toUpperCase(Locale.ROOT))
        .distinct()
        .toList();
return normalizedLots.isEmpty() ? List.of() : repository.findPreviouslyIssuedLots(normalizedLots);
}

public String nextChallanNo() {
int nextSerial = 1;
String latestChallanNo = repository.findLatestChallanNo().orElse(null);
if (latestChallanNo != null) {
String[] parts = latestChallanNo.split("/");
if (parts.length > 1) {
try {
nextSerial = Integer.parseInt(parts[1]) + 1;
} catch (NumberFormatException ignored) {
nextSerial = 1;
}
}
}
return String.format(Locale.ROOT, "D-%d/%04d", java.time.LocalDate.now().getYear(), nextSerial);
}


public Optional<DyeingOutward> findById(Long id) {
return repository.findById(id);
}


public void delete(Long id) {
repository.deleteById(id);
}
}
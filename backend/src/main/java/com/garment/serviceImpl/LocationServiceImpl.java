package com.garment.serviceImpl;


import com.garment.DTO.LocationDTO;
import com.garment.model.Location;
import com.garment.repository.LocationRepository;
import com.garment.service.LocationService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Year;
import java.util.Comparator;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class LocationServiceImpl implements LocationService {

    private final LocationRepository repo;

    private static final Pattern SERIAL_PATTERN =
            Pattern.compile("^LOC/(\\d{4})-(\\d+)$", Pattern.CASE_INSENSITIVE);

    private String buildSerial(int year, int number) {
        return "LOC/" + year + "-" + String.format("%04d", number);
    }

    @Override
    public String getNextSerial() {
        int year = Year.now().getValue();
        String prefix = "LOC/" + year + "-";
        List<String> serials = repo.findSerialsByPrefix(prefix);
        int max = serials.stream()
                .map(s -> {
                    Matcher m = SERIAL_PATTERN.matcher(s == null ? "" : s);
                    if (m.matches() && Integer.parseInt(m.group(1)) == year) {
                        try { return Integer.parseInt(m.group(2)); } catch (Exception ignore) {}
                    }
                    return 0;
                })
                .max(Comparator.naturalOrder())
                .orElse(0);
        return buildSerial(year, max + 1);
    }

    @Override
    public List<LocationDTO> findAll(String search) {
        List<Location> list = (search == null || search.isBlank())
                ? repo.findAll()
                : repo.search(search.trim());
        return list.stream().map(this::toDTO).toList();
    }

    @Override
    public LocationDTO getById(Long id) {
        Location e = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Location not found with id: " + id));
        return toDTO(e);
    }

    @Override
    @Transactional
    public LocationDTO create(LocationDTO dto) {
        Location e = new Location();
        applyCreate(dto, e);
        e.setSerialNumber(getNextSerial()); // server-generated serial
        if (e.getActive() == null) e.setActive(Boolean.TRUE);
        try {
            e = repo.save(e);
        } catch (DataIntegrityViolationException ex) {
            // Rare race: regenerate and retry once
            e.setSerialNumber(getNextSerial());
            e = repo.save(e);
        }
        return toDTO(e);
    }

    @Override
    @Transactional
    public LocationDTO update(Long id, LocationDTO dto) {
        Location e = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Location not found with id: " + id));
        applyUpdate(dto, e); // do not change serial on update
        e = repo.save(e);
        return toDTO(e);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Location not found with id: " + id);
        }
        repo.deleteById(id);
    }

    // ---------- Mapping helpers (no separate mapper class) ----------
    private LocationDTO toDTO(Location e) {
        LocationDTO d = new LocationDTO();
        d.setId(e.getId());
        d.setSerialNumber(e.getSerialNumber());
        d.setBranchName(e.getBranchName());
        d.setBranchCode(e.getBranchCode());
        d.setStation(e.getStation());
        d.setStateName(e.getStateName());
        d.setAddress(e.getAddress());
        d.setPinCode(e.getPinCode());
        d.setPhone(e.getPhone());
        d.setEmail(e.getEmail());
        d.setTransportName(e.getTransportName());
        d.setActive(e.getActive());
        d.setRemarks(e.getRemarks());
        return d;
    }

    private void applyCreate(LocationDTO d, Location e) {
        e.setBranchName(d.getBranchName());
        e.setBranchCode(d.getBranchCode());
        e.setStation(d.getStation());
        e.setStateName(d.getStateName());
        e.setAddress(d.getAddress());
        e.setPinCode(d.getPinCode());
        e.setPhone(d.getPhone());
        e.setEmail(d.getEmail());
        e.setTransportName(d.getTransportName());
        e.setActive(d.getActive());
        e.setRemarks(d.getRemarks());
    }

    private void applyUpdate(LocationDTO d, Location e) {
        e.setBranchName(d.getBranchName());
        e.setBranchCode(d.getBranchCode());
        e.setStation(d.getStation());
        e.setStateName(d.getStateName());
        e.setAddress(d.getAddress());
        e.setPinCode(d.getPinCode());
        e.setPhone(d.getPhone());
        e.setEmail(d.getEmail());
        e.setTransportName(d.getTransportName());
        e.setActive(d.getActive());
        e.setRemarks(d.getRemarks());
    }
}
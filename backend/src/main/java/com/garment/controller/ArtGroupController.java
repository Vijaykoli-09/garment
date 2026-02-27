package com.garment.controller;

import com.garment.model.ArtGroup;
import com.garment.service.ArtGroupService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/artgroup")
@CrossOrigin(origins = "http://localhost:3000")
//@CrossOrigin(origins = "*") 
public class ArtGroupController {

    private final ArtGroupService service;

    public ArtGroupController(ArtGroupService service) {
        this.service = service;
    }

    // GET /api/artgroup/list
    @GetMapping("/list")
    public List<ArtGroup> listAll() {
        return service.listAll();
    }

    // POST /api/artgroup/save
    @PostMapping("/save")
    public ArtGroup save(@RequestBody ArtGroup artGroup) {
        // save will create new or overwrite existing with same id
        return service.save(artGroup);
    }

    // PUT /api/artgroup/update/{serialNo}
    @PutMapping("/update/{serialNo}")
    public ArtGroup update(@PathVariable String serialNo, @RequestBody ArtGroup payload) {
        return service.findById(serialNo)
                .map(existing -> {
                    existing.setArtGroupName(payload.getArtGroupName());
                    existing.setSeriesRangeStart(payload.getSeriesRangeStart());
                    existing.setSeriesRangeEnd(payload.getSeriesRangeEnd());
                    return service.save(existing);
                })
                // if not found, create new with provided serialNo
                .orElseGet(() -> {
                    payload.setSerialNo(serialNo);
                    return service.save(payload);
                });
    }

    // DELETE /api/artgroup/delete/{serialNo}
    @DeleteMapping("/delete/{serialNo}")
    public ResponseEntity<?> delete(@PathVariable String serialNo) {
        service.deleteById(serialNo);
        return ResponseEntity.ok().build();
    }
}

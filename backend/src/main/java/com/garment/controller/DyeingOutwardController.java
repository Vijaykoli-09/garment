package com.garment.controller;

import com.garment.DTO.DyeingOutwardListDTO;
import com.garment.DTO.DyeingOutwardLotCheckDTO;
import com.garment.DTO.PagedResponse;
import com.garment.model.DyeingOutward;
import com.garment.service.DyeingOutwardService;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;


import java.util.List;


@RestController
@RequestMapping("/api/dyeing-outward")
//@CrossOrigin(origins = "*")
@CrossOrigin(origins = "http://localhost:3000")
public class DyeingOutwardController {
private final DyeingOutwardService service;


public DyeingOutwardController(DyeingOutwardService service) {
this.service = service;
}


@GetMapping
public List<DyeingOutward> listAll() {
return service.findAll();
}

@GetMapping("/paged")
public PagedResponse<DyeingOutwardListDTO> listPaged(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(required = false) String search) {
Page<DyeingOutwardListDTO> result = service.findAllPaged(page, size, search);
return PagedResponse.of(result);
}

@GetMapping("/issued-source-keys")
public List<String> issuedSourceKeys(@RequestParam(required = false) Long excludeId) {
return service.findIssuedSourceKeys(excludeId);
}

@PostMapping("/previously-issued-lots")
public List<String> previouslyIssuedLots(@RequestBody DyeingOutwardLotCheckDTO request) {
return service.findPreviouslyIssuedLots(request.getLotNos());
}

@GetMapping("/next-challan-no")
public String nextChallanNo() {
return service.nextChallanNo();
}


@GetMapping("/{id}")
public DyeingOutward getById(@PathVariable Long id) {
// no try/catch per your request; will return 500 if not found
return service.findById(id).get();
}


@PostMapping
public DyeingOutward create(@RequestBody DyeingOutward payload) {
// client sends rows as array — JPA entities will be saved
return service.save(payload);
}


@PutMapping("/{id}")
public DyeingOutward update(@PathVariable Long id, @RequestBody DyeingOutward payload) {
return service.update(id, payload);
}


@DeleteMapping("/{id}")
public void delete(@PathVariable Long id) {
service.delete(id);
}
}
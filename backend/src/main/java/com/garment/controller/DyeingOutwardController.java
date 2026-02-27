package com.garment.controller;


import com.garment.model.DyeingOutward;
import com.garment.service.DyeingOutwardService;
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
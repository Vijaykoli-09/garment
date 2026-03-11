package com.garment.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.garment.DTO.PaymentReciptDTO;
import com.garment.service.PaymentReciptService;

@RestController
@RequestMapping("/api/payment/recipt")
@CrossOrigin(origins = "http://localhost:3000")
public class PaymentReciptController {

    private final PaymentReciptService service;

    public PaymentReciptController(PaymentReciptService service) {
        this.service = service;
    }

    // matches frontend: POST /payment/create
    @PostMapping("/create")
    public ResponseEntity<PaymentReciptDTO> create(@RequestBody PaymentReciptDTO dto) {
        PaymentReciptDTO created = service.create(dto);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    // matches frontend: GET /payment
    @GetMapping
    public List<PaymentReciptDTO> getAll() {
        return service.getAll();
    }

    // matches frontend: GET /payment/{id}
    @GetMapping("/{id}")
    public PaymentReciptDTO getById(@PathVariable Long id) {
        return service.getById(id);
    }

    // matches frontend: PUT /payment/{id}
    @PutMapping("/{id}")
    public PaymentReciptDTO update(@PathVariable Long id, @RequestBody PaymentReciptDTO dto) {
        return service.update(id, dto);
    }

    // matches frontend: DELETE /payment/{id}
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    // matches frontend: GET /payment/names/Party
    @GetMapping("/names/{type}")
    public List<String> getNames(@PathVariable String type) {
        return service.getNamesByType(type);
    }
}
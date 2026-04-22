// src/main/java/com/garment/controller/PaymentReciptController.java
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
@RequestMapping("/api/recipt")
@CrossOrigin(origins = "http://localhost:3000")
public class PaymentReciptController {

    private final PaymentReciptService service;

    public PaymentReciptController(PaymentReciptService service) {
        this.service = service;
    }

    @PostMapping("/create")
    public ResponseEntity<PaymentReciptDTO> create(@RequestBody PaymentReciptDTO dto) {
        PaymentReciptDTO created = service.create(dto);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @GetMapping
    public List<PaymentReciptDTO> getAll() {
        return service.getAll();
    }

    @GetMapping("/{id}")
    public PaymentReciptDTO getById(@PathVariable Long id) {
        return service.getById(id);
    }

    @PutMapping("/{id}")
    public PaymentReciptDTO update(@PathVariable Long id,
                                   @RequestBody PaymentReciptDTO dto) {
        return service.update(id, dto);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    @GetMapping("/names/{type}")
    public List<String> getNames(@PathVariable String type) {
        return service.getNamesByType(type);
    }
}
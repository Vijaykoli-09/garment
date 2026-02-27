package com.garment.controller;

import com.garment.model.Party;
import com.garment.service.PartyService;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/party")
@CrossOrigin(origins = "http://localhost:3000")
public class PartyController {

    private final PartyService service;

    public PartyController(PartyService service) {
        this.service = service;
    }

    @PostMapping("/save")
    public Party saveParty(@RequestBody Party party) {
        return service.saveParty(party);
    }

    @GetMapping("/all")
    public List<Party> getAllParties() {
        return service.getAllParties();
    }

    @GetMapping("/{id}")
    public Optional<Party> getPartyById(@PathVariable Long id) {
        return service.getPartyById(id);
    }

    @GetMapping("/category/{categoryName}")
    public List<Party> getPartiesByCategory(@PathVariable String categoryName) {
        return service.getPartiesByCategory(categoryName);
    }

    @PutMapping("/update/{id}")
    public Party updateParty(@PathVariable Long id, @RequestBody Party party) {
        party.setId(id);
        return service.updateParty(party);
    }

    @DeleteMapping("/delete/{id}")
    public void deleteParty(@PathVariable Long id) {
        service.deleteParty(id);
    }

    @GetMapping("/search")
    public Party searchByName(@RequestParam String name) {
        return service.getPartyByName(name);
    }
}

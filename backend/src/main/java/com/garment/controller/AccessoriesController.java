package com.garment.controller;

import com.garment.model.Accessories;
import com.garment.service.AccessoriesService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("api/accessories")
@CrossOrigin(origins = "http://localhost:3000") // ✅ allow React
public class AccessoriesController {

    private final AccessoriesService accessoriesService;

    public AccessoriesController(AccessoriesService accessoriesService) {
        this.accessoriesService = accessoriesService;
    }

    @PostMapping("/save")
    public Accessories saveAccessory(@RequestBody Accessories accessories) {
        return accessoriesService.saveAccessory(accessories);
    }

    @GetMapping("/list")
    public List<Accessories> getAllAccessories() {
        return accessoriesService.getAllAccessories();
    }

    @PutMapping("/update/{serialNumber}")
    public Accessories updateAccessory(@PathVariable String serialNumber, @RequestBody Accessories updatedAccessory) {
        return accessoriesService.updateAccessory(serialNumber, updatedAccessory);
    }

    @DeleteMapping("/delete/{serialNumber}")
    public void deleteAccessory(@PathVariable String serialNumber) {
        accessoriesService.deleteAccessory(serialNumber);
    }
}

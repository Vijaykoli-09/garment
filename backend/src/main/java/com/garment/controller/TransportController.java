package com.garment.controller;

import com.garment.model.Transport;
import com.garment.service.TransportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

// @CrossOrigin(origins = "*")

@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api/transports")
public class TransportController {

    @Autowired
    private TransportService transportService;

    // Create a new transport
    @PostMapping
    public ResponseEntity<Transport> createTransport(@RequestBody Transport transport) {
        Transport createdTransport = transportService.createTransport(transport);
        return new ResponseEntity<>(createdTransport, HttpStatus.CREATED);
    }

    // Update an existing transport
    @PutMapping("/{serialNumber}")
    public ResponseEntity<Transport> updateTransport(@PathVariable String serialNumber,
            @RequestBody Transport transport) {
        Transport updatedTransport = transportService.updateTransport(serialNumber, transport);
        if (updatedTransport != null) {
            return new ResponseEntity<>(updatedTransport, HttpStatus.OK);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    // Get transport by ID
    @GetMapping("/{serialNumber}")
    public ResponseEntity<Transport> getTransportById(@PathVariable String serialNumber) {
        Optional<Transport> transport = transportService.getTransportById(serialNumber);
        if (transport.isPresent()) {
            return new ResponseEntity<>(transport.get(), HttpStatus.OK);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    // Get all transports
    @GetMapping
    public ResponseEntity<List<Transport>> getAllTransports() {
        List<Transport> transports = transportService.getAllTransports();
        return new ResponseEntity<>(transports, HttpStatus.OK);
    }

    // Delete transport by ID
    @DeleteMapping("/{serialNumber}")
    public ResponseEntity<Void> deleteTransport(@PathVariable String serialNumber) {
        Optional<Transport> transport = transportService.getTransportById(serialNumber);
        if (transport.isPresent()) {
            transportService.deleteTransport(serialNumber);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

} //🔚End Controller

// Search transports
// @GetMapping("/search")
// public ResponseEntity<List<Transport>>
// searchTransports(@RequestParam(required = false) String term) {
// List<Transport> transports = transportService.searchTransports(term);
// return new ResponseEntity<>(transports, HttpStatus.OK);
// }

// Get transport by transport code
// @GetMapping("/code/{code}")
// public ResponseEntity<Transport> getTransportByCode(@PathVariable String
// code) {
// Transport transport = transportService.findByTransportCode(code);
// if (transport != null) {
// return new ResponseEntity<>(transport, HttpStatus.OK);
// }
// return new ResponseEntity<>(HttpStatus.NOT_FOUND);
// }

// Get transport by email
// @GetMapping("/email/{email}")
// public ResponseEntity<Transport> getTransportByEmail(@PathVariable String
// email) {
// Transport transport = transportService.findByEmail(email);
// if (transport != null) {
// return new ResponseEntity<>(transport, HttpStatus.OK);
// }
// return new ResponseEntity<>(HttpStatus.NOT_FOUND);
// }


// Get transports by city
// @GetMapping("/city/{city}")
// public ResponseEntity<List<Transport>> getTransportsByCity(@PathVariable
// String city) {
// List<Transport> transports = transportService.getTransportsByCity(city);
// return new ResponseEntity<>(transports, HttpStatus.OK);
// }

// Check if transport code exists
// @GetMapping("/exists/code/{code}")
// public ResponseEntity<Boolean> checkTransportCodeExists(@PathVariable String
// code) {
// boolean exists = transportService.existsByTransportCode(code);
// return new ResponseEntity<>(exists, HttpStatus.OK);
// }

// Check if email exists
// @GetMapping("/exists/email/{email}")
// public ResponseEntity<Boolean> checkEmailExists(@PathVariable String email) {
// boolean exists = transportService.existsByEmail(email);
// return new ResponseEntity<>(exists, HttpStatus.OK);
// }

// Get transport statistics
// @GetMapping("/stats")
// public ResponseEntity<TransportStats> getTransportStats() {
// long totalCount = transportService.getTotalTransportsCount();
// TransportStats stats = new TransportStats(totalCount);
// return new ResponseEntity<>(stats, HttpStatus.OK);
// }

// // Inner class for transport statistics
// public static class TransportStats {
//     private long totalCount;

//     public TransportStats(long totalCount) {
//         this.totalCount = totalCount;
//     }

//     // Getters
//     public long getTotalCount() {
//         return totalCount;
//     }

//     // Setters
//     public void setTotalCount(long totalCount) {
//         this.totalCount = totalCount;
//     }

// }

// }
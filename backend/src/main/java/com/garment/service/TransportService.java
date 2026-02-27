package com.garment.service;

import com.garment.model.Transport;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

@Service
public interface TransportService {

// Create a new transport
Transport createTransport(Transport transport);

// Update an existing transport🧑‍🏫
Transport updateTransport(String  serialNumber, Transport transport);

// Get transport by ID🧑‍🏫
Optional<Transport> getTransportById(String  serialNumber);

// Get all transports
List<Transport> getAllTransports();


// Delete transport by ID🧑‍🏫
void deleteTransport(String serialNumber);

// Search transports by name, code, or city
List<Transport> searchTransports(String searchTerm);

// // Find transport by transport code
// Transport findByTransportCode(String transportCode);

// // Find transport by email
// Transport findByEmail(String email);

// // Check if transport code exists
// boolean existsByTransportCode(String transportCode);

// // Check if email exists
// boolean existsByEmail(String email);



// // Get transports by city
// List<Transport> getTransportsByCity(String city);


// // Get count of total transports
// long getTotalTransportsCount();

}
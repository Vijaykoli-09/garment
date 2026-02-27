package com.garment.repository;

import com.garment.model.Transport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TransportRepository extends JpaRepository<Transport, String> {

// Find transports by name containing (case insensitive)
List<Transport> findByTransportNameContainingIgnoreCase(String
transportName);

// Find transports by code containing (case insensitive)
// List<Transport> findByTransportCodeContainingIgnoreCase(String
// transportCode);

// Find transports by city containing (case insensitive)
List<Transport> findByCityContainingIgnoreCase(String city);


// "LOWER(t.transportCode) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
// Custom query to search by multiple fields
@Query("SELECT t FROM Transport t WHERE " +
"LOWER(t.transportName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
"LOWER(t.city) LIKE LOWER(CONCAT('%', :searchTerm, '%'))")
List<Transport> searchTransports(@Param("searchTerm") String searchTerm);

// Find transport by transport code (exact match)
// Transport findByTransportCode(String transportCode);

// Find transport by email
Transport findByEmail(String email);


}
package com.garment.service.serviceImpl;

import com.garment.model.Transport;
import com.garment.repository.TransportRepository;
import com.garment.service.TransportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class TransportServiceImpl implements TransportService {

@Autowired
private TransportRepository transportRepository;

@Override
public Transport createTransport(Transport transport) {
    //save
    return transportRepository.save(transport);
}

//update 🧑‍🏫
@Override
public Transport updateTransport(String serialNumber, Transport transport) {
    Optional<Transport> existingTransport = transportRepository.findById(serialNumber);
    if (existingTransport.isPresent()) {
        Transport updatedTransport = existingTransport.get();
        // fields✅
        updatedTransport.setTransportName(transport.getTransportName());
        // updatedTransport.setTransportCode(transport.getTransportCode());
        updatedTransport.setMobile(transport.getMobile());
        updatedTransport.setEmail(transport.getEmail());
        // updatedTransport.setVehicleNo(transport.getVehicleNo());
        // updatedTransport.setLicenseNo(transport.getLicenseNo());
        updatedTransport.setCity(transport.getCity());
        updatedTransport.setState(transport.getState());
        updatedTransport.setPincode(transport.getPincode());
        updatedTransport.setAddress(transport.getAddress());
        updatedTransport.setRemarks(transport.getRemarks());

        return transportRepository.save(updatedTransport);
    }
    return null;
}

//🧑‍🏫
@Override
public Optional<Transport> getTransportById(String serialNumber) {
return transportRepository.findById(serialNumber);
}

@Override
public List<Transport> getAllTransports() {
return transportRepository.findAll();
}

//🧑‍🏫
@Override
public void deleteTransport(String serialNumber) {
transportRepository.deleteById(serialNumber);
}

@Override
public List<Transport> searchTransports(String searchTerm) {
if (searchTerm == null || searchTerm.trim().isEmpty()) {
return getAllTransports();
}
return transportRepository.searchTransports(searchTerm.trim());
}

// @Override
// public Transport findByTransportCode(String transportCode) {
// return transportRepository.findByTransportCode(transportCode);
// }

// @Override
// public Transport findByEmail(String email) {
// return transportRepository.findByEmail(email);
// }

// @Override
// public boolean existsByTransportCode(String transportCode) {
// return transportRepository.findByTransportCode(transportCode) != null;
// }

// @Override
// public boolean existsByEmail(String email) {
// return transportRepository.findByEmail(email) != null;
// }


// @Override
// public List<Transport> getTransportsByCity(String city) {
// return transportRepository.findByCityContainingIgnoreCase(city);
// }

// @Override
// public long getTotalTransportsCount() {
//     return transportRepository.count();
// }


}
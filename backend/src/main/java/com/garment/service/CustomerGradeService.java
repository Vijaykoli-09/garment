package com.garment.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.garment.model.CustomerGrade;
import com.garment.repository.CustomerGradeRepository;

@Service
public class CustomerGradeService {
	private final CustomerGradeRepository repository;

    public CustomerGradeService(CustomerGradeRepository repository) {
        this.repository = repository;
    }

    public CustomerGrade saveGrade(CustomerGrade grade) {
        return repository.save(grade);
    }

    public CustomerGrade updateGrade(String serialNo, CustomerGrade grade) {
        Optional<CustomerGrade> existing = repository.findById(serialNo);
        if (existing.isPresent()) {
            CustomerGrade g = existing.get();
            g.setGradeName(grade.getGradeName());
            return repository.save(g);
        }
        throw new RuntimeException("CustomerGrade not found");
    }

    public void deleteGrade(String serialNo) {
        repository.deleteById(serialNo);
    }

    public List<CustomerGrade> getAllGrades() {
        return repository.findAll();
    }

    public Optional<CustomerGrade> getGradeById(String serialNo) {
        return repository.findById(serialNo);
    }


	
}

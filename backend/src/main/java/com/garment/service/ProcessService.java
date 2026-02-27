package com.garment.service;

import com.garment.model.Process;
import com.garment.repository.ProcessRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ProcessService {

    private final ProcessRepository repository;

    public ProcessService(ProcessRepository repository) {
        this.repository = repository;
    }

    public Process saveProcess(Process process) {
        return repository.save(process);
    }

    public Process updateProcess(String serialNo, Process process) {
        Optional<Process> existing = repository.findById(serialNo);
        if (existing.isPresent()) {
            Process p = existing.get();
            p.setProcessName(process.getProcessName());
//            p.setCategory(process.getCategory());
            return repository.save(p);
        }
        throw new RuntimeException("Process not found");
    }

    public void deleteProcess(String serialNo) {
        repository.deleteById(serialNo);
    }

    public List<Process> getAllProcesses() {
        return repository.findAll();
    }

    public Optional<Process> getProcessById(String serialNo) {
        return repository.findById(serialNo);
    }
}


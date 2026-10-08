package com.garment.controller;

import com.garment.DTO.DyeingBatchDTO;
import com.garment.service.DyeingBatchService;

import jakarta.persistence.EntityNotFoundException;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/dyeing-batch")
@CrossOrigin(origins = "http://localhost:3000")
public class DyeingBatchController {

    private final DyeingBatchService service;

    public DyeingBatchController(
            DyeingBatchService service
    ) {
        this.service = service;
    }

    // =========================================================
    // CREATE
    // =========================================================

    @PostMapping
    public ResponseEntity<?> create(
            @RequestBody DyeingBatchDTO dto
    ) {

        try {

            DyeingBatchDTO saved =
                    service.save(dto);

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(saved);

        } catch (IllegalArgumentException e) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            java.util.Map.of(
                                    "message",
                                    e.getMessage()
                            )
                    );

        } catch (Exception e) {

            e.printStackTrace();

            return ResponseEntity
                    .status(
                            HttpStatus.INTERNAL_SERVER_ERROR
                    )
                    .body(
                            java.util.Map.of(
                                    "message",
                                    "Failed to create Dyeing Batch"
                            )
                    );
        }
    }

    // =========================================================
    // UPDATE
    // =========================================================

    @PutMapping("/{id}")
    public ResponseEntity<?> update(
            @PathVariable Long id,
            @RequestBody DyeingBatchDTO dto
    ) {

        try {

            DyeingBatchDTO updated =
                    service.update(id, dto);

            return ResponseEntity.ok(updated);

        } catch (EntityNotFoundException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(
                            java.util.Map.of(
                                    "message",
                                    e.getMessage()
                            )
                    );

        } catch (IllegalArgumentException e) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            java.util.Map.of(
                                    "message",
                                    e.getMessage()
                            )
                    );

        } catch (Exception e) {

            e.printStackTrace();

            return ResponseEntity
                    .status(
                            HttpStatus.INTERNAL_SERVER_ERROR
                    )
                    .body(
                            java.util.Map.of(
                                    "message",
                                    "Failed to update Dyeing Batch"
                            )
                    );
        }
    }

    // =========================================================
    // GET ALL
    // =========================================================

    @GetMapping
    public ResponseEntity<?> getAll() {

        try {

            List<DyeingBatchDTO> result =
                    service.findAll();

            return ResponseEntity.ok(result);

        } catch (Exception e) {

            e.printStackTrace();

            return ResponseEntity
                    .status(
                            HttpStatus.INTERNAL_SERVER_ERROR
                    )
                    .body(
                            java.util.Map.of(
                                    "message",
                                    "Failed to load Dyeing Batches"
                            )
                    );
        }
    }

    // =========================================================
    // GET BY ID
    // =========================================================

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(
            @PathVariable Long id
    ) {

        try {

            return ResponseEntity.ok(
                    service.findById(id)
            );

        } catch (EntityNotFoundException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(
                            java.util.Map.of(
                                    "message",
                                    e.getMessage()
                            )
                    );
        }
    }

    // =========================================================
    // DELETE
    // =========================================================

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(
            @PathVariable Long id
    ) {

        try {

            service.delete(id);

            return ResponseEntity.ok(
                    java.util.Map.of(
                            "message",
                            "Dyeing Batch deleted successfully"
                    )
            );

        } catch (EntityNotFoundException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(
                            java.util.Map.of(
                                    "message",
                                    e.getMessage()
                            )
                    );

        } catch (Exception e) {

            e.printStackTrace();

            return ResponseEntity
                    .status(
                            HttpStatus.INTERNAL_SERVER_ERROR
                    )
                    .body(
                            java.util.Map.of(
                                    "message",
                                    "Failed to delete Dyeing Batch"
                            )
                    );
        }
    }
}
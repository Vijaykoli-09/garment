package com.garment.controller;

import com.garment.service.CloudinaryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * FIXED: Separate base path /api/admin/images to avoid conflict
 * with ProductController which also uses /api/admin/products
 *
 * POST   /api/admin/images/upload        → single image
 * POST   /api/admin/images/upload-multi  → multiple images
 * DELETE /api/admin/images/delete        → delete from Cloudinary
 */
@RestController
@RequestMapping("/api/admin/images")
public class ImageUploadController {

    private final CloudinaryService cloudinaryService;

    public ImageUploadController(CloudinaryService cloudinaryService) {
        this.cloudinaryService = cloudinaryService;
    }

    // ── Single image upload ────────────────────────────────────────
    @PostMapping("/upload")
    public ResponseEntity<?> uploadImage(@RequestParam("file") MultipartFile file) {
        try {
            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "No file received."));
            }
            String url = cloudinaryService.uploadImage(file);
            return ResponseEntity.ok(Map.of(
                    "url", url,
                    "message", "Uploaded successfully."
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Upload failed: " + e.getMessage()));
        }
    }

    // ── Multiple images upload ─────────────────────────────────────
    @PostMapping("/upload-multi")
    public ResponseEntity<?> uploadMultiple(@RequestParam("files") List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No files received."));
        }
        if (files.size() > 10) {
            return ResponseEntity.badRequest().body(Map.of("error", "Max 10 images allowed."));
        }

        List<String> urls = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        for (MultipartFile file : files) {
            try {
                urls.add(cloudinaryService.uploadImage(file));
            } catch (Exception e) {
                errors.add(file.getOriginalFilename() + ": " + e.getMessage());
            }
        }

        return ResponseEntity.ok(Map.of(
                "urls", urls,
                "errors", errors,
                "uploaded", urls.size(),
                "failed", errors.size()
        ));
    }

    // ── Delete image ───────────────────────────────────────────────
    @DeleteMapping("/delete")
    public ResponseEntity<?> deleteImage(@RequestBody Map<String, String> body) {
        String url = body.get("url");
        if (url == null || url.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Image URL is required."));
        }
        cloudinaryService.deleteImage(url);
        return ResponseEntity.ok(Map.of("message", "Deleted."));
    }
}
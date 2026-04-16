package com.garment.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Arrays;
import java.util.Map;

@Service
public class CloudinaryService {

    private final Cloudinary cloudinary;

    public CloudinaryService(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    // ── Upload image ────────────────────────────────────────────────
    public String uploadImage(MultipartFile file) throws IOException {

        // Validate type
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new RuntimeException("Only image files are allowed. Received: " + contentType);
        }

        // Validate size (10 MB)
        if (file.getSize() > 10 * 1024 * 1024) {
            throw new RuntimeException("File too large. Max size is 10 MB.");
        }

        try {
            // ✅ SIMPLIFIED upload params — no transformation block that can cause issues
            @SuppressWarnings("unchecked")
            Map<String, Object> result = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", "products",
                            "resource_type", "image"
                    )
            );

            String url = (String) result.get("secure_url");

            if (url == null || url.isBlank()) {
                throw new RuntimeException("Cloudinary returned no URL. Check your credentials.");
            }

            System.out.println("[Cloudinary] Upload success: " + url);
            return url;

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            System.err.println("[Cloudinary] Upload error: " + e.getMessage());
            throw new IOException("Cloudinary upload failed: " + e.getMessage(), e);
        }
    }

    // ── Delete image ────────────────────────────────────────────────
    public void deleteImage(String imageUrl) {
        try {
            String publicId = extractPublicId(imageUrl);
            if (publicId != null) {
                System.out.println("[Cloudinary] Deleting: " + publicId);
                cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
            }
        } catch (Exception e) {
            System.err.println("[Cloudinary] Delete failed: " + e.getMessage());
        }
    }

    // ── Extract public_id from URL ──────────────────────────────────
    private String extractPublicId(String url) {
        try {
            // https://res.cloudinary.com/dlyrjwkzs/image/upload/v123/products/abc.jpg
            int uploadIndex = url.indexOf("/upload/");
            if (uploadIndex == -1) return null;

            String after = url.substring(uploadIndex + 8);

            // Skip version (v1234/)
            if (after.startsWith("v") && after.contains("/")) {
                after = after.substring(after.indexOf("/") + 1);
            }

            // Remove extension
            int dot = after.lastIndexOf(".");
            if (dot != -1) after = after.substring(0, dot);

            return after; // e.g. "products/abc123"
        } catch (Exception e) {
            return null;
        }
    }
}
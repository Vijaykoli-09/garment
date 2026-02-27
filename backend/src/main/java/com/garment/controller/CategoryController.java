package com.garment.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.garment.model.Category;
import com.garment.service.CategoryService;

@RestController
@RequestMapping("/api/categories")
@CrossOrigin(origins = "http://localhost:3000") // allow React frontend
public class CategoryController {
	 private final CategoryService categoryService;

	    public CategoryController(CategoryService categoryService) {
	        this.categoryService = categoryService;
	    }

	    // Get all categories
	    @GetMapping
	    public List<Category> getAllCategories() {
	        return categoryService.getAllCategories();
	    }

	    // Get category by serialNo
	    @GetMapping("/{serialNo}")
	    public ResponseEntity<Category> getCategoryById(@PathVariable String serialNo) {
	        return categoryService.getCategoryById(serialNo)
	                .map(ResponseEntity::ok)
	                .orElse(ResponseEntity.notFound().build());
	    }

	    // Create new category
	    @PostMapping
	    public Category createCategory(@RequestBody Category category) {
	        return categoryService.saveCategory(category);
	    }

	    // Update category
	    @PutMapping("/{serialNo}")
	    public ResponseEntity<Category> updateCategory(@PathVariable String serialNo, @RequestBody Category category) {
	        try {
	            return ResponseEntity.ok(categoryService.updateCategory(serialNo, category));
	        } catch (RuntimeException e) {
	            return ResponseEntity.notFound().build();
	        }
	    }

	    // Delete category
	    @DeleteMapping("/{serialNo}")
	    public ResponseEntity<Void> deleteCategory(@PathVariable String serialNo) {
	        try {
	            categoryService.deleteCategory(serialNo);
	            return ResponseEntity.noContent().build();
	        } catch (RuntimeException e) {
	            return ResponseEntity.notFound().build();
	        }
	    }
}

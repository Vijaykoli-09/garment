package com.garment.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.garment.model.Category;
import com.garment.repository.CategoryRepository;

@Service
public class CategoryService {
	private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }

    public Optional<Category> getCategoryById(String serialNo) {
        return categoryRepository.findById(serialNo);
    }

    public Category saveCategory(Category category) {
        return categoryRepository.save(category);
    }

    public Category updateCategory(String serialNo, Category category) {
        if (categoryRepository.existsById(serialNo)) {
            category.setSerialNo(serialNo);
            return categoryRepository.save(category);
        }
        throw new RuntimeException("Category not found with serialNo: " + serialNo);
    }

    public void deleteCategory(String serialNo) {
        if (categoryRepository.existsById(serialNo)) {
            categoryRepository.deleteById(serialNo);
        } else {
            throw new RuntimeException("Category not found with serialNo: " + serialNo);
        }
    }
}

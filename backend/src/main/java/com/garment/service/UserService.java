// src/main/java/com/garment/service/UserService.java
package com.garment.service;


import com.garment.DTO.LoginRequest;
import com.garment.DTO.LoginResponse;
import com.garment.DTO.SignupRequest;
import com.garment.model.User;
import com.garment.repository.UserRepository;
import com.garment.security.JwtUtil;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public UserService(UserRepository userRepository,
                       BCryptPasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    // Signup
    public void signup(SignupRequest req) {
        String email = normalizeEmail(req.email());
        if (!StringUtils.hasText(req.password())) {
            throw new IllegalArgumentException("Password is required");
        }
        if (req.confirmPassword() != null && !req.password().equals(req.confirmPassword())) {
            throw new IllegalArgumentException("Passwords do not match");
        }
        userRepository.findByEmailIgnoreCase(email).ifPresent(u -> {
            throw new IllegalStateException("Email already exists");
        });

        User u = new User();
        u.setFirstname(req.firstname());
        u.setLastname(req.lastname());
        u.setEmail(email);
        u.setPhone(req.phone());
        u.setPassword(passwordEncoder.encode(req.password()));
        userRepository.save(u);
    }

    // Login
    public LoginResponse login(LoginRequest req) {
        String email = normalizeEmail(req.email());
        User u = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        if (!passwordEncoder.matches(req.password(), u.getPassword())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        String token = jwtUtil.generateToken(email);
        return new LoginResponse(token, u.getId(), u.getEmail(), u.getFirstname(), u.getLastname(), u.getPhone());
    }

    private String normalizeEmail(String raw) {
        if (raw == null) return null;
        return raw.trim().toLowerCase();
    }
}

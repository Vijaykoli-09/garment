package com.garment.controller;

import com.garment.DTO.LoginRequest;
import com.garment.DTO.LoginResponse;
import com.garment.DTO.SignupRequest;
import com.garment.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = {"http://localhost:3000"}, allowCredentials = "true")
public class AuthController {

    private static final String ALLOWED_EMAIL = "shreyansgolchha433@gmail.com";
    private static final String FIXED_PASSWORD = "sug232323";

    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@Valid @RequestBody SignupRequest req) {


        if (!ALLOWED_EMAIL.equalsIgnoreCase(req.email())) {
            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body("Abhi ke liye signup sirf " + ALLOWED_EMAIL + " ke liye allowed hai.");
        }


        SignupRequest fixedReq = new SignupRequest(
                req.firstname(),
                req.lastname(),
                req.email(),
                req.phone(),
                FIXED_PASSWORD,
                FIXED_PASSWORD
        );

        userService.signup(fixedReq);
        return ResponseEntity.ok("User registered successfully");
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest req) {


        if (!ALLOWED_EMAIL.equalsIgnoreCase(req.email())
                || !FIXED_PASSWORD.equals(req.password())) {

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .build();
        }

        return ResponseEntity.ok(userService.login(req));
    }
    @GetMapping("/health")
    public String health() {
        return "OK";
    }
}



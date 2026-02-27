package com.garment.DTO;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SignupRequest (
	@NotBlank @Size(max = 100) String firstname,
    @NotBlank @Size(max = 100) String lastname,
    @NotBlank @Email @Size(max = 255) String email,
    @Size(max = 20) String phone,
    @NotBlank @Size(min = 8, max = 255) String password,
    String confirmPassword
) {}

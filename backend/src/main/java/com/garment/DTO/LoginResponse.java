package com.garment.DTO;

public record LoginResponse(
		String token,
        Long id,
        String email,
        String firstname,
        String lastname,
        String phone
) {}

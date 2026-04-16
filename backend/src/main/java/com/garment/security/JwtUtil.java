package com.garment.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Component
public class JwtUtil {

    // ✅ Secret now comes from application.properties → jwt.secret
    // This avoids hardcoding secrets in source code
    private final Key SECRET_KEY;
    private final long EXPIRATION_TIME = 1000L * 60 * 60 * 10; // 10 hours

    public JwtUtil(@Value("${jwt.secret}") String secret) {
        // Key must be at least 32 bytes for HS256
        this.SECRET_KEY = Keys.hmacShaKeyFor(secret.getBytes());
    }

    // Generate JWT token — subject is email (web) or phone (mobile)
    public String generateToken(String subject) {
        return Jwts.builder()
                .setSubject(subject)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .signWith(SECRET_KEY, SignatureAlgorithm.HS256)
                .compact();
    }

    // Extract subject (email or phone) from token
    public String extractEmail(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(SECRET_KEY)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    // Validate token
    public boolean validateToken(String token, String subject) {
        return extractEmail(token).equals(subject) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(SECRET_KEY)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getExpiration()
                .before(new Date());
    }
}
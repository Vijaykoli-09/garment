package com.garment.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    @Autowired
    private JwtUtil jwtUtil;

    // ── BUG FIX: Inject BOTH UserDetailsService beans ──────────────────────────
    //
    // ROOT CAUSE OF 403:
    // The mobile JWT subject = phone number (set in CustomerAuthController login).
    // The old filter used the web admin UserDetailsService which does findByEmail().
    // Phone not found by email → UsernameNotFoundException → caught silently →
    // no authentication set on SecurityContext → Spring rejects with 403.
    //
    // FIX: Mobile paths (/api/orders/**, /api/customer/**) use CustomerUserDetailsService
    // which does findByPhone(). Web admin paths use the original UserDetailsService.
    //
    @Autowired
    @Qualifier("customUserDetailsService")   // web admin — loads by email/username
    private UserDetailsService webUserDetailsService;

    @Autowired
    private CustomerUserDetailsService customerUserDetailsService;  // mobile — loads by phone

    /**
     * Skip JWT filter entirely for:
     * - Web admin auth endpoints
     * - Mobile customer auth endpoints (login/signup — no token exists yet)
     * - CORS preflight (OPTIONS)
     */
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path   = request.getServletPath();
        String method = request.getMethod();
        return path.startsWith("/api/auth/")
            || path.equals("/api/customer/auth/login")    // no token at login
            || path.equals("/api/customer/auth/signup")   // no token at signup
            || "OPTIONS".equalsIgnoreCase(method);
        // NOTE: /api/customer/auth/profile is NOT skipped — it requires JWT
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        // No Bearer token → continue unauthenticated (public endpoints will pass, protected will 403)
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String jwt     = authHeader.substring(7).trim();
        String subject; // phone (mobile) or email (web admin)

        try {
            subject = jwtUtil.extractEmail(jwt); // method name is misleading — returns the subject (phone or email)
        } catch (Exception e) {
            filterChain.doFilter(request, response);
            return;
        }

        if (subject != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            String path     = request.getServletPath();
            boolean isMobile = path.startsWith("/api/orders/")
                             || path.startsWith("/api/customer/");

            try {
                // ── BUG FIX: choose the right service based on the request path ──
                // Mobile paths: JWT subject = phone → use CustomerUserDetailsService
                // Web admin paths: JWT subject = email → use webUserDetailsService
                UserDetails userDetails = isMobile
                        ? customerUserDetailsService.loadUserByUsername(subject)
                        : webUserDetailsService.loadUserByUsername(subject);

                if (jwtUtil.validateToken(jwt, userDetails.getUsername())) {
                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails, null, userDetails.getAuthorities());
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            } catch (Exception e) {
                // user not found or token invalid → leave unauthenticated
                // Spring Security will return 401/403 for protected endpoints
            }
        }

        filterChain.doFilter(request, response);
    }
}
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

    @Autowired
    @Qualifier("customUserDetailsService")
    private UserDetailsService webUserDetailsService;

    @Autowired
    private CustomerUserDetailsService customerUserDetailsService;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path   = request.getServletPath();
        String method = request.getMethod();
        return path.startsWith("/api/auth/")
            || path.equals("/api/customer/auth/login")
            || path.equals("/api/customer/auth/signup")
            || "OPTIONS".equalsIgnoreCase(method);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String jwt     = authHeader.substring(7).trim();
        String subject;

        try {
            subject = jwtUtil.extractEmail(jwt);
        } catch (Exception e) {
            filterChain.doFilter(request, response);
            return;
        }

        if (subject != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                // IMPROVEMENT over your version:
                // OLD: detected mobile by URL path (startsWith "/api/orders/" etc.)
                //      Problem: any new mobile endpoint not in that list would fail.
                //
                // NEW: detect by JWT subject format.
                //      Phone numbers are 10 digits → mobile customer token.
                //      Emails contain '@' → web admin token.
                //      This works for ALL endpoints automatically.
                boolean isMobileToken = subject.matches("^[0-9]{10}$");

                UserDetails userDetails = isMobileToken
                        ? customerUserDetailsService.loadUserByUsername(subject)
                        : webUserDetailsService.loadUserByUsername(subject);

                if (jwtUtil.validateToken(jwt, userDetails.getUsername())) {
                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails, null, userDetails.getAuthorities());
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            } catch (Exception e) {
                // user not found or account not approved → leave unauthenticated
            }
        }

        filterChain.doFilter(request, response);
    }
}
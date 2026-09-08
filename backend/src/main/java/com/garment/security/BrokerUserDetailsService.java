package com.garment.security;

import com.garment.model.Agent;
import com.garment.repository.AgentRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Authenticates broker JWTs. JwtAuthFilter passes the *full* token
 * subject here — "broker:<serialNo>" — not just the serialNo, because
 * JwtUtil.validateToken() re-checks the token subject against
 * userDetails.getUsername(), so the returned UserDetails' username
 * must match the full subject exactly (same convention already used
 * for the phone/email subjects in the other UserDetailsServices).
 */
@Service
public class BrokerUserDetailsService implements UserDetailsService {

    private static final String BROKER_SUBJECT_PREFIX = "broker:";

    private final AgentRepository agentRepository;

    public BrokerUserDetailsService(AgentRepository agentRepository) {
        this.agentRepository = agentRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String subject) throws UsernameNotFoundException {
        if (subject == null || !subject.startsWith(BROKER_SUBJECT_PREFIX)) {
            throw new UsernameNotFoundException("Not a broker token subject: " + subject);
        }
        String serialNo = subject.substring(BROKER_SUBJECT_PREFIX.length());

        Agent agent = agentRepository.findById(serialNo)
                .orElseThrow(() -> new UsernameNotFoundException("Broker not found: " + serialNo));

        // username kept as the FULL subject (with prefix) — see class doc
        return new User(subject, "", List.of(new SimpleGrantedAuthority("ROLE_BROKER")));
    }
}
package com.garment.service;

import com.garment.model.Agent;
import com.garment.repository.AgentRepository;
import com.garment.security.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class AgentService {

    private final AgentRepository repository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    private static final int MAX_PIN_ATTEMPTS   = 5;
    private static final int LOCKOUT_MINUTES    = 15;

    public AgentService(AgentRepository repository,
                         BCryptPasswordEncoder passwordEncoder,
                         JwtUtil jwtUtil) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    public Agent save(Agent agent) {
        // defaults (optional safety)
        if (agent.getOpeningBalance() == null) agent.setOpeningBalance(BigDecimal.ZERO);
        if (agent.getOpeningBalanceType() == null || agent.getOpeningBalanceType().isBlank())
            agent.setOpeningBalanceType("DR");

        return repository.save(agent);
    }

    public Agent update(String serialNo, Agent updatedAgent) {
        return repository.findById(serialNo)
                .map(agent -> {
                    agent.setAgentName(updatedAgent.getAgentName());
                    agent.setContactNos(updatedAgent.getContactNos());
                    agent.setEmail(updatedAgent.getEmail());
                    agent.setAddress(updatedAgent.getAddress());
                    agent.setCity(updatedAgent.getCity());
                    agent.setState(updatedAgent.getState());
                    agent.setZipCode(updatedAgent.getZipCode());

                    agent.setOpeningBalance(updatedAgent.getOpeningBalance() == null ? BigDecimal.ZERO : updatedAgent.getOpeningBalance());
                    agent.setOpeningBalanceType(
                            (updatedAgent.getOpeningBalanceType() == null || updatedAgent.getOpeningBalanceType().isBlank())
                                    ? "DR"
                                    : updatedAgent.getOpeningBalanceType()
                    );

                    return repository.save(agent);
                })
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND,
                                "Agent not found with serialNo: " + serialNo));
    }

    public List<Agent> getAll() {
        return repository.findAll();
    }

    public Agent getBySerialNo(String serialNo) {
        return repository.findById(serialNo)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND,
                                "Agent not found with serialNo: " + serialNo));
    }

    public void delete(String serialNo) {
        if (!repository.existsById(serialNo)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Agent not found with serialNo: " + serialNo);
        }
        repository.deleteById(serialNo);
    }

    // ══════════════════════════════════════════════════════════════════
    // BROKER PIN AUTH (mobile app)
    // ══════════════════════════════════════════════════════════════════

    /**
     * Step 1 — tells the app whether this phone belongs to a broker and
     * whether they've set a PIN yet. Deliberately never returns the
     * Agent record itself or any token — that only happens after PIN
     * verification below.
     */
    public Map<String, Object> checkPhone(String contactNo) {
        return repository.findFirstByContactNo(contactNo)
                .<Map<String, Object>>map(agent -> Map.of(
                        "exists", true,
                        "hasPinSet", agent.getPinHash() != null
                ))
                .orElseGet(() -> Map.of("exists", false));
    }

    /**
     * Step 2a — first-time PIN setup. Rejected if a PIN is already set
     * (use verifyPin to log in instead) so this can't be used to
     * silently take over an existing broker's account.
     */
    public PinAuthOutcome setPin(String contactNo, String pin) {
        Agent agent = repository.findFirstByContactNo(contactNo).orElse(null);
        if (agent == null) {
            return new PinAuthOutcome(HttpStatus.NOT_FOUND.value(),
                    Map.of("code", "AGENT_NOT_FOUND", "error", "No broker found with this phone number."));
        }
        if (agent.getPinHash() != null) {
            return new PinAuthOutcome(HttpStatus.CONFLICT.value(),
                    Map.of("code", "PIN_ALREADY_SET", "error", "A PIN is already set for this account. Please log in instead."));
        }
        if (pin == null || !pin.matches("^[0-9]{4}$")) {
            return new PinAuthOutcome(HttpStatus.BAD_REQUEST.value(),
                    Map.of("code", "INVALID_PIN_FORMAT", "error", "PIN must be exactly 4 digits."));
        }

        agent.setPinHash(passwordEncoder.encode(pin));
        agent.setFailedPinAttempts(0);
        agent.setPinLockedUntil(null);
        repository.save(agent);

        return successOutcome(agent);
    }

    /**
     * Step 2b — returning broker login. Enforces attempt-limiting and a
     * temporary lockout server-side (client-side limits can always be
     * bypassed by calling the API directly).
     */
    public PinAuthOutcome verifyPin(String contactNo, String pin) {
        Agent agent = repository.findFirstByContactNo(contactNo).orElse(null);
        if (agent == null) {
            return new PinAuthOutcome(HttpStatus.NOT_FOUND.value(),
                    Map.of("code", "AGENT_NOT_FOUND", "error", "No broker found with this phone number."));
        }
        if (agent.getPinHash() == null) {
            return new PinAuthOutcome(HttpStatus.BAD_REQUEST.value(),
                    Map.of("code", "PIN_NOT_SET", "error", "No PIN set for this account yet. Please set one up first."));
        }

        LocalDateTime now = LocalDateTime.now();
        if (agent.getPinLockedUntil() != null && agent.getPinLockedUntil().isAfter(now)) {
            return new PinAuthOutcome(HttpStatus.LOCKED.value(),
                    Map.of("code", "PIN_LOCKED", "error", "Too many wrong attempts. Contact admin to reset your PIN."));
        }

        boolean matches = pin != null && passwordEncoder.matches(pin, agent.getPinHash());

        if (!matches) {
            int attempts = agent.getFailedPinAttempts() + 1;
            agent.setFailedPinAttempts(attempts);

            if (attempts >= MAX_PIN_ATTEMPTS) {
                agent.setPinLockedUntil(now.plusMinutes(LOCKOUT_MINUTES));
                repository.save(agent);
                return new PinAuthOutcome(HttpStatus.LOCKED.value(),
                        Map.of("code", "PIN_LOCKED", "error", "Too many wrong attempts. Contact admin to reset your PIN."));
            }

            repository.save(agent);
            int remaining = MAX_PIN_ATTEMPTS - attempts;
            return new PinAuthOutcome(HttpStatus.UNAUTHORIZED.value(),
                    Map.of("code", "INVALID_PIN", "attemptsRemaining", remaining));
        }

        // Success — reset attempt counter/lockout
        agent.setFailedPinAttempts(0);
        agent.setPinLockedUntil(null);
        repository.save(agent);

        return successOutcome(agent);
    }

    /**
     * Admin-triggered reset (call comes in, admin resets manually).
     * Clears the PIN so the broker goes through first-time setup again
     * next login. NOTE: currently reachable because /api/agent/** is
     * permitAll — wire this behind your web-admin auth before shipping
     * (e.g. move it under an already-authenticated admin path, or add
     * a matcher requiring the admin's web JWT) so a broker can't reset
     * their own lockout by calling this directly.
     */
    public PinAuthOutcome resetPin(String serialNo) {
        Agent agent = repository.findById(serialNo).orElse(null);
        if (agent == null) {
            return new PinAuthOutcome(HttpStatus.NOT_FOUND.value(),
                    Map.of("code", "AGENT_NOT_FOUND", "error", "No broker found with this serial number."));
        }
        agent.setPinHash(null);
        agent.setFailedPinAttempts(0);
        agent.setPinLockedUntil(null);
        repository.save(agent);
        return new PinAuthOutcome(HttpStatus.OK.value(),
                Map.of("message", "PIN cleared. Broker will be prompted to set a new PIN on next login."));
    }

    private PinAuthOutcome successOutcome(Agent agent) {
        String token = jwtUtil.generateToken("broker:" + agent.getSerialNo());
        return new PinAuthOutcome(HttpStatus.OK.value(), Map.of("token", token, "agent", agent));
    }
}
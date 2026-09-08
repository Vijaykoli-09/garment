package com.garment.service;

import java.util.Map;

/**
 * Carries an HTTP status alongside its JSON body for the broker PIN
 * endpoints (set-pin / verify-pin), so AgentService can express
 * "200 with token" or "401 INVALID_PIN with attemptsRemaining" or
 * "423 PIN_LOCKED" etc. without needing custom exception classes —
 * matches the existing Map<String,Object>-based style used by
 * AgentService.checkPhone().
 */
public record PinAuthOutcome(int httpStatus, Map<String, Object> body) {
}
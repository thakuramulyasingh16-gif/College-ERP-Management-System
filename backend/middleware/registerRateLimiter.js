/**
 * Register Rate Limiter Middleware
 * 
 * Prevents account enumeration and mass bot registration by tracking registration attempts per IP.
 * - Maximum 5 registration attempts per IP within a 15-minute rolling window.
 * - Rejects excess requests with HTTP 429 and Retry-After header.
 */

// In-memory store: Map<ip, number[]>
const registerAttempts = new Map();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;            // Max 5 attempts per window

/**
 * Extracts client IP from request, taking proxy headers into account safely.
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  let ip = '127.0.0.1';
  if (forwarded) {
    ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]).trim();
  } else if (req.ip) {
    ip = req.ip.trim();
  } else if (req.socket && req.socket.remoteAddress) {
    ip = req.socket.remoteAddress.trim();
  }
  return ip || '127.0.0.1';
}

/**
 * Clean up timestamps outside the rolling window
 */
function pruneAttempts(timestamps, now) {
  return timestamps.filter(ts => now - ts < WINDOW_MS);
}

/**
 * Express middleware for registration rate limiting
 */
function registerRateLimiter(req, res, next) {
  const ip = getClientIp(req);
  const now = Date.now();

  let attempts = registerAttempts.get(ip) || [];
  attempts = pruneAttempts(attempts, now);

  if (attempts.length >= MAX_ATTEMPTS) {
    const oldest = attempts[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000));
    res.set('Retry-After', String(retryAfterSeconds));
    return res.status(429).json({
      success: false,
      message: `Too many registration attempts from this IP. Please try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s).`,
      retryAfter: retryAfterSeconds
    });
  }

  attempts.push(now);
  registerAttempts.set(ip, attempts);
  next();
}

// Periodic cleanup of stale IPs every 5 minutes (unref to not block process termination)
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of registerAttempts.entries()) {
    const active = pruneAttempts(timestamps, now);
    if (active.length === 0) {
      registerAttempts.delete(ip);
    } else {
      registerAttempts.set(ip, active);
    }
  }
}, 5 * 60 * 1000);
if (cleanupTimer.unref) cleanupTimer.unref();

module.exports = {
  registerRateLimiter,
  getClientIp,
  getRegisterAttemptsStore: () => registerAttempts,
  resetAll: () => registerAttempts.clear()
};

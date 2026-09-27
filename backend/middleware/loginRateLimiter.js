/**
 * Login Rate Limiter Middleware
 * 
 * Prevents brute-force attacks by tracking failed login attempts per (identifier + IP).
 * - Maximum 5 failed attempts within a 60-second rolling window.
 * - After 5 failed attempts, the identifier is locked out for 60 seconds.
 * - Subsequent requests during lockout are rejected with HTTP 429 and live retryAfter countdown.
 * - Lockout counter resets to 0 after 60 seconds automatically.
 * - Successful login immediately resets the failed attempts counter to 0.
 */

// In-memory store: Map<key, { attempts: number[], lockedUntil: number | null }>
const loginAttempts = new Map();

const WINDOW_MS = 60 * 1000; // 60 seconds rolling window
const MAX_ATTEMPTS = 5;       // Maximum 5 failed attempts allowed
const LOCKOUT_MS = 60 * 1000; // 60 seconds lockout

/**
 * Extracts normalized identifier (email/username/mobile) and client IP from request.
 */
function getKey(req) {
  const rawId = req.body?.email || req.body?.username || req.body?.mobile || req.body?.loginIdentifier || '';
  const identifier = String(rawId).trim().toLowerCase();

  const forwarded = req.headers['x-forwarded-for'];
  let ip = '127.0.0.1';
  if (forwarded) {
    ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]).trim();
  } else if (req.ip) {
    ip = req.ip.trim();
  } else if (req.socket && req.socket.remoteAddress) {
    ip = req.socket.remoteAddress.trim();
  }

  return `${identifier || 'anonymous'}::${ip}`;
}

/**
 * Clean up expired attempts for a record
 */
function pruneRecord(record, now) {
  if (!record) return null;

  // If locked, check if lockout has expired
  if (record.lockedUntil) {
    if (now >= record.lockedUntil) {
      // Lockout expired - reset completely
      record.lockedUntil = null;
      record.attempts = [];
    }
  } else {
    // Prune attempts outside rolling window
    record.attempts = record.attempts.filter((ts) => now - ts < WINDOW_MS);
  }

  return record;
}

/**
 * Record a failed login attempt
 */
function recordFailedAttempt(key) {
  const now = Date.now();
  let record = loginAttempts.get(key);

  if (!record) {
    record = { attempts: [], lockedUntil: null };
    loginAttempts.set(key, record);
  }

  pruneRecord(record, now);

  record.attempts.push(now);

  // If maximum failed attempts reached, engage lockout
  if (record.attempts.length >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS;
    record.attempts = []; // Reset attempts for next cycle after lockout
  }
}

/**
 * Record a successful login - resets the counter immediately
 */
function recordSuccessfulLogin(key) {
  loginAttempts.delete(key);
}

/**
 * Express middleware for login rate limiting
 */
function loginRateLimiter(req, res, next) {
  const key = getKey(req);
  const now = Date.now();

  let record = loginAttempts.get(key);
  if (record) {
    pruneRecord(record, now);

    // If still locked out, return 429 with retryAfter
    if (record.lockedUntil && now < record.lockedUntil) {
      const remainingSeconds = Math.max(1, Math.ceil((record.lockedUntil - now) / 1000));
      res.set('Retry-After', String(remainingSeconds));
      return res.status(429).json({
        message: `Too many failed login attempts. Please try again in ${remainingSeconds} seconds.`,
        retryAfter: remainingSeconds,
      });
    }
  }

  // Intercept res.json to track success or failure
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    // If login was successful (HTTP 200..299)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      recordSuccessfulLogin(key);
    }
    // If login failed (HTTP 401 Unauthorized)
    else if (res.statusCode === 401) {
      recordFailedAttempt(key);
    }

    return originalJson(body);
  };

  next();
}

// Periodic cleanup of stale keys every 5 minutes (unref to not block process termination)
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of loginAttempts.entries()) {
    pruneRecord(record, now);
    if (!record.lockedUntil && record.attempts.length === 0) {
      loginAttempts.delete(key);
    }
  }
}, 5 * 60 * 1000);
if (cleanupTimer.unref) cleanupTimer.unref();

module.exports = {
  loginRateLimiter,
  recordFailedAttempt,
  recordSuccessfulLogin,
  getKey,
  getLoginAttemptsStore: () => loginAttempts,
  resetAll: () => loginAttempts.clear(),
};

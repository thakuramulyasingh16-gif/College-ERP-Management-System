const jwt = require("jsonwebtoken");
const db = require("../config/db");

// In-memory blacklist for explicitly logged-out tokens
const blacklistedTokens = new Set();

/**
 * Adds a JWT to the in-memory blacklist so it cannot be used again.
 */
const blacklistToken = (token) => {
  try {
    const decoded = jwt.decode(token);
    const key = decoded && decoded.jti ? decoded.jti : token;
    blacklistedTokens.add(key);

    if (decoded && decoded.exp) {
      const msUntilExpiry = decoded.exp * 1000 - Date.now();
      if (msUntilExpiry > 0) {
        setTimeout(() => blacklistedTokens.delete(key), msUntilExpiry + 1000);
      } else {
        blacklistedTokens.delete(key);
      }
    }
  } catch (e) {
    blacklistedTokens.add(token);
  }
};

// ─── Idle timeout config ───────────────────────────────────────────────────────
// IDLE_TIMEOUT_MINUTES env var, default 60. Supports decimals (e.g. 0.05 for tests).
function getIdleTimeoutMs() {
  const mins = parseFloat(process.env.IDLE_TIMEOUT_MINUTES || '60');
  return (isNaN(mins) || mins <= 0 ? 60 : mins) * 60 * 1000;
}

// Write-throttle: only update last_activity_at in MySQL at most once per 60 s per user.
// Key: userId (number), Value: last DB-write timestamp (ms)
const lastWrittenMap = new Map();
const WRITE_THROTTLE_MS = 60 * 1000;

// Periodic cleanup of the write-throttle map (entries older than 2× throttle window)
setInterval(() => {
  const cutoff = Date.now() - WRITE_THROTTLE_MS * 2;
  for (const [uid, ts] of lastWrittenMap.entries()) {
    if (ts < cutoff) lastWrittenMap.delete(uid);
  }
}, 5 * 60 * 1000).unref();

/**
 * Update last_activity_at in DB for a user, throttled to once per WRITE_THROTTLE_MS.
 * @param {number} userId
 */
async function touchActivity(userId) {
  const now = Date.now();
  const lastWrite = lastWrittenMap.get(userId) || 0;
  if (now - lastWrite < WRITE_THROTTLE_MS) return; // throttled
  lastWrittenMap.set(userId, now);
  try {
    await db.execute(
      "UPDATE users SET last_activity_at = NOW() WHERE id = ?",
      [userId]
    );
  } catch (err) {
    console.warn("touchActivity DB error:", err.message);
  }
}

/**
 * Routes that must NOT refresh the idle timer:
 * Dashboard.jsx polls /api/session/check every 20 s via api.get('/session/check').
 * GET /api/auth/session-check, /api/auth/verify, /api/auth/me, GET /api/session/check
 * are polling/health endpoints and must be excluded so they don't keep sessions alive.
 */
const SKIP_ACTIVITY_FLAG = Symbol('skipIdleActivity');

/**
 * Mark a request handler so auth() will NOT touch last_activity_at for it.
 * Usage:  auth({ skipActivity: true })
 *         or applied via skipActivity option in auth factory.
 */

/**
 * Express middleware factory: verifies JWT, validates single active session against DB,
 * enforces idle timeout (server-side), and updates last_activity_at (throttled).
 *
 * @param {string[]} roles - Allowed roles. Empty = any authenticated user is allowed.
 * @param {object}  opts
 * @param {boolean} opts.skipActivity - If true, do NOT refresh last_activity_at (polling endpoints).
 */
const auth = (roles = [], opts = {}) => {
  const skipActivity = opts.skipActivity === true;

  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ 
        code: "NO_TOKEN",
        message: "Access denied. No token provided." 
      });
    }

    const token = authHeader.split(" ")[1];

    // Reject blacklisted (explicitly logged-out) tokens before verifying
    try {
      const pre = jwt.decode(token);
      const key = pre && pre.jti ? pre.jti : token;
      if (blacklistedTokens.has(key)) {
        return res.status(401).json({ 
          code: "SESSION_INVALIDATED",
          message: "Token has been invalidated. Please log in again." 
        });
      }
    } catch {
      return res.status(401).json({ 
        code: "INVALID_TOKEN",
        message: "Invalid token." 
      });
    }

    try {
      // 1. Verify signature AND expiry
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // identity comes from verified token only

      // 2. Single active session check + idle timeout check (single DB query)
      try {
        const [rows] = await db.execute(
          "SELECT current_session_token, last_activity_at FROM users WHERE id = ?",
          [req.user.id]
        );

        if (!rows || rows.length === 0 || rows[0].current_session_token !== token) {
          return res.status(401).json({
            code: "SESSION_INVALIDATED",
            message: "You have been logged out because your account was signed in from another device."
          });
        }

        // 3. Idle timeout check (only if column exists and is set)
        const lastActivity = rows[0].last_activity_at;
        if (lastActivity) {
          const idleMs = getIdleTimeoutMs();
          const idleSince = Date.now() - new Date(lastActivity).getTime();
          if (idleSince > idleMs) {
            // Expire: clear session token and blacklist JWT
            try {
              await db.execute(
                "UPDATE users SET current_session_token = NULL, last_activity_at = NULL WHERE id = ?",
                [req.user.id]
              );
            } catch (_) {}
            blacklistToken(token);
            return res.status(401).json({
              code: "SESSION_IDLE_TIMEOUT",
              message: "You were logged out because of inactivity."
            });
          }
        }

        // 4. Touch activity (throttled) — skip for polling/health check endpoints
        if (!skipActivity) {
          touchActivity(req.user.id).catch(() => {});
        }
      } catch (dbErr) {
        // If column doesn't exist yet during initial migration window, proceed safely
        console.warn("Session token DB check warning:", dbErr.message);
      }

      // 5. Admin can access any route regardless of role list
      if (req.user.role === "admin") {
        return next();
      }

      if (roles.length && !roles.includes(req.user.role)) {
        return res.status(403).json({ 
          code: "FORBIDDEN",
          message: "Access forbidden. Insufficient permissions." 
        });
      }

      next();
    } catch (ex) {
      if (ex.name === "TokenExpiredError") {
        return res.status(401).json({ 
          code: "SESSION_EXPIRED",
          message: "Token expired. Please log in again." 
        });
      }
      return res.status(401).json({ 
        code: "INVALID_TOKEN",
        message: "Invalid token." 
      });
    }
  };
};

// Export touchActivity so authController can call it directly
module.exports = auth;
module.exports.blacklistToken = blacklistToken;
module.exports.touchActivity = touchActivity;

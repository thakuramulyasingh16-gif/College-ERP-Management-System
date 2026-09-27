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

/**
 * Express middleware factory: verifies JWT, validates single active session against DB,
 * and enforces role-based access.
 * @param {string[]} roles - Allowed roles. Empty = any authenticated user is allowed.
 */
const auth = (roles = []) => {
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

      // 2. Single active session check: verify this token matches the user's currentSessionToken in DB
      try {
        const [rows] = await db.execute(
          "SELECT current_session_token FROM users WHERE id = ?",
          [req.user.id]
        );

        if (!rows || rows.length === 0 || rows[0].current_session_token !== token) {
          return res.status(401).json({
            code: "SESSION_INVALIDATED",
            message: "You have been logged out because your account was signed in from another device."
          });
        }
      } catch (dbErr) {
        // If column doesn't exist yet during initial migration window, proceed safely
        console.warn("Session token DB check warning:", dbErr.message);
      }

      // 3. Admin can access any route regardless of role list
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

module.exports = auth;
module.exports.blacklistToken = blacklistToken;

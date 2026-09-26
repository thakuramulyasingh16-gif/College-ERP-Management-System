const jwt = require("jsonwebtoken");

// In-memory token blacklist for invalidated tokens (logout).
// For multi-instance deployments, replace with a shared store (e.g. Redis).
const blacklistedTokens = new Set();

/**
 * Adds a token to the blacklist on logout.
 * Automatically cleans up after the token's natural expiry time.
 * @param {string} token - The raw JWT string to invalidate
 */
const blacklistToken = (token) => {
  if (!token) return;
  try {
    const decoded = jwt.decode(token);
    // Use jti if present, otherwise store the token itself
    const key = decoded && decoded.jti ? decoded.jti : token;
    blacklistedTokens.add(key);

    // Auto-cleanup once the token would have expired anyway
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
 * Express middleware factory: verifies JWT and enforces role-based access.
 * @param {string[]} roles - Allowed roles. Empty = any authenticated user is allowed.
 */
const auth = (roles = []) => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];

    // Reject blacklisted (explicitly logged-out) tokens before verifying
    try {
      const pre = jwt.decode(token);
      const key = pre && pre.jti ? pre.jti : token;
      if (blacklistedTokens.has(key)) {
        return res.status(401).json({ message: "Token has been invalidated. Please log in again." });
      }
    } catch {
      return res.status(401).json({ message: "Invalid token." });
    }

    try {
      // Verify signature AND expiry — do NOT trust client-provided identity
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // identity comes from verified token only

      // Admin can access any route regardless of role list
      if (req.user.role === "admin") {
        return next();
      }

      if (roles.length && !roles.includes(req.user.role)) {
        return res.status(403).json({ message: "Access forbidden. Insufficient permissions." });
      }

      next();
    } catch (ex) {
      if (ex.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired. Please log in again." });
      }
      return res.status(401).json({ message: "Invalid token." });
    }
  };
};

module.exports = auth;
module.exports.blacklistToken = blacklistToken;

const jwt = require('jsonwebtoken');
const path = require('path');

const ALLOWED_ROLES = ['admin', 'teacher', 'student'];

/**
 * Upload Authentication & Path Traversal Protection Middleware
 * 
 * Protects uploaded media (profile photos, study materials) from unauthenticated scraping.
 * Accepts JWT via:
 * 1. Authorization header: "Bearer <token>"
 * 2. Query param: "?token=<token>" (used for <img> tags and target="_blank" PDF downloads)
 */
function uploadAuth(req, res, next) {
  let token = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      code: "UNAUTHORIZED",
      message: "Authentication required to access uploaded resources."
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id || !ALLOWED_ROLES.includes(decoded.role)) {
      return res.status(403).json({
        code: "FORBIDDEN",
        message: "Access forbidden: Invalid credentials or role."
      });
    }

    // Path traversal prevention: verify requested path resolves inside uploads directory
    const uploadsRoot = path.resolve(__dirname, '../uploads');
    const targetPath = path.resolve(uploadsRoot, '.' + decodeURIComponent(req.path));

    if (!targetPath.startsWith(uploadsRoot)) {
      return res.status(403).json({
        code: "FORBIDDEN",
        message: "Access forbidden: Invalid resource path."
      });
    }

    req.user = decoded;
    // Set security headers for static files
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        code: "TOKEN_EXPIRED",
        message: "Access token has expired. Please refresh your session."
      });
    }
    return res.status(401).json({
      code: "INVALID_TOKEN",
      message: "Invalid authentication token."
    });
  }
}

module.exports = uploadAuth;

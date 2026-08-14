const jwt = require("jsonwebtoken");

module.exports = (roles = []) => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;

      // Allow admin to bypass all role checks
      if (req.user.role === 'admin') {
        return next();
      }

      if (roles.length && !roles.includes(req.user.role)) {
        return res.status(403).json({ message: "Access forbidden. Insufficient permissions." });
      }

      next();
    } catch (ex) {
      res.status(401).json({ message: "Invalid token." });
    }
  };
};

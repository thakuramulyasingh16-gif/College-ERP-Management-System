const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const auth = require("../middleware/auth");
const { loginRateLimiter } = require("../middleware/loginRateLimiter");

// Public routes
router.post("/login", loginRateLimiter, authController.login);
router.post("/register", authController.register);

// Protected routes
router.get("/verify", auth(), authController.verify);
router.get("/me", auth(), authController.verify);
router.get("/session-check", auth(), (req, res) => res.json({ valid: true }));
router.post("/logout", auth(), authController.logout);

module.exports = router;

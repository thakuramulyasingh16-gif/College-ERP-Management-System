const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const auth = require("../middleware/auth");
const { loginRateLimiter } = require("../middleware/loginRateLimiter");
const { registerRateLimiter } = require("../middleware/registerRateLimiter");
const { otpRequestRateLimiter, otpVerifyRateLimiter } = require("../middleware/rateLimiters");

// Public routes
router.post("/login", loginRateLimiter, authController.login);
router.post("/register", registerRateLimiter, authController.register);

// Forgot Password Flow (Students & Teachers only)
router.post("/forgot-password/request", otpRequestRateLimiter, authController.requestOtp);
router.post("/forgot-password/verify", otpVerifyRateLimiter, authController.verifyOtp);
router.post("/forgot-password/reset", authController.resetForgotPassword);

// Protected routes
router.get("/verify", auth(), authController.verify);
router.get("/me", auth(), authController.verify);
router.get("/session-check", auth(), (req, res) => res.json({ valid: true }));
router.post("/logout", auth(), authController.logout);

module.exports = router;

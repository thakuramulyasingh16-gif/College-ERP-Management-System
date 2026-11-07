const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const auth = require("../middleware/auth");
const { loginRateLimiter } = require("../middleware/loginRateLimiter");
const { registerRateLimiter } = require("../middleware/registerRateLimiter");
const {
  otpRequestRateLimiter,
  otpVerifyRateLimiter,
  activityRateLimiter
} = require("../middleware/rateLimiters");

// Public routes
router.post("/login", loginRateLimiter, authController.login);
router.post("/register", registerRateLimiter, authController.register);

// Forgot Password Flow (Students & Teachers only)
router.post("/forgot-password/request", otpRequestRateLimiter, authController.requestOtp);
router.post("/forgot-password/verify", otpVerifyRateLimiter, authController.verifyOtp);
router.post("/forgot-password/reset", authController.resetForgotPassword);

// Protected routes
// verify/me/session-check are polling endpoints — skipActivity so they don't reset the idle clock
router.get("/verify",         auth([], { skipActivity: true }), authController.verify);
router.get("/me",             auth([], { skipActivity: true }), authController.verify);
router.get("/session-check",  auth([], { skipActivity: true }), (req, res) => res.json({ valid: true }));
router.post("/logout", auth(), authController.logout);

// Activity heartbeat (throttled to at most one DB write per 60s)
router.post("/activity", auth(), activityRateLimiter, async (req, res) => {
  try {
    const { touchActivity } = require("../middleware/auth");
    await touchActivity(req.user.id);
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: true });
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const auth = require("../middleware/auth");
const { loginRateLimiter } = require("../middleware/loginRateLimiter");
const { registerRateLimiter } = require("../middleware/registerRateLimiter");
const {
  otpRequestRateLimiter,
  otpVerifyRateLimiter,
  captchaChallengeLimiter,
} = require("../middleware/rateLimiters");
const {
  createCaptcha,
  deleteCaptcha,
  verifyCaptchaMiddleware,
} = require("../middleware/captcha");

// ── CAPTCHA challenge (public) ─────────────────────────────────────────────────
// GET /api/auth/captcha
// Optional: ?prev=<oldId>  deletes the previous captcha before issuing a new one
// Returns: { captchaId, svg }  — answer is NEVER included
router.get("/captcha", captchaChallengeLimiter, (req, res) => {
  // Delete the previous captcha if the client sends its id (reload scenario)
  if (req.query.prev) {
    deleteCaptcha(req.query.prev);
  }
  const { captchaId, svg } = createCaptcha();
  res.json({ captchaId, svg });
});

// Public routes
// loginRateLimiter runs FIRST (locked-out clients get 429 before captcha check)
router.post(
  "/login",
  loginRateLimiter,
  verifyCaptchaMiddleware,
  authController.login
);
router.post("/register", registerRateLimiter, authController.register);

// Forgot Password Flow (Students & Teachers only)
router.post(
  "/forgot-password/request",
  otpRequestRateLimiter,
  authController.requestOtp
);
router.post(
  "/forgot-password/verify",
  otpVerifyRateLimiter,
  authController.verifyOtp
);
router.post("/forgot-password/reset", authController.resetForgotPassword);

// Protected routes
router.get("/verify", auth(), authController.verify);
router.get("/me", auth(), authController.verify);
router.get("/session-check", auth(), (req, res) => res.json({ valid: true }));
router.post("/logout", auth(), authController.logout);

module.exports = router;

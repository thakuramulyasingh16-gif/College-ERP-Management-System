const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const auth = require("../middleware/auth");

// Public routes
router.post("/login", authController.login);
router.post("/register", authController.register);

// Protected logout route — requires a valid token so we know which one to blacklist
router.post("/logout", auth(), authController.logout);

module.exports = router;

const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { blacklistToken } = require("../middleware/auth");
const { sendOtpSms } = require("../services/smsService");

// In-memory OTP store: userId -> { userId, otp, expiresAt, attempts, mobile, identifier }
const otpStore = new Map();

// In-memory single-use reset tokens: resetToken -> { userId, expiresAt }
const activeResetTokens = new Map();

// Periodic prune of expired OTPs & reset tokens
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of otpStore.entries()) {
    if (val.expiresAt < now) otpStore.delete(key);
  }
  for (const [key, val] of activeResetTokens.entries()) {
    if (val.expiresAt < now) activeResetTokens.delete(key);
  }
}, 5 * 60 * 1000).unref();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_REGEX = /^[0-9]{10}$/;

exports.register = async (req, res) => {
  const { name, email, mobile, password } = req.body;
  const role = 'student';

  if (!name || !email || !mobile || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const cleanName = String(name).trim();
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanMobile = String(mobile).trim();
  const cleanPassword = String(password);

  // Input Validation
  if (cleanName.length < 2 || cleanName.length > 100) {
    return res.status(400).json({ message: "Name must be between 2 and 100 characters" });
  }

  if (!EMAIL_REGEX.test(cleanEmail) || cleanEmail.length > 100) {
    return res.status(400).json({ message: "Please provide a valid email address" });
  }

  if (!MOBILE_REGEX.test(cleanMobile)) {
    return res.status(400).json({ message: "Mobile number must be exactly 10 digits" });
  }

  if (cleanPassword.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters long" });
  }

  if (cleanPassword.length > 128) {
    return res.status(400).json({ message: "Password cannot exceed 128 characters" });
  }

  try {
    const [existingUser] = await db.execute(
      "SELECT * FROM users WHERE email = ? OR mobile = ?",
      [cleanEmail, cleanMobile]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ 
        message: existingUser[0].email === cleanEmail ? "Email already registered" : "Mobile number already registered" 
      });
    }

    const hashedPassword = await bcrypt.hash(cleanPassword, 10);

    const [result] = await db.execute(
      "INSERT INTO users (name, email, mobile, password, role) VALUES (?, ?, ?, ?, ?)",
      [cleanName, cleanEmail, cleanMobile, hashedPassword, role]
    );

    res.status(201).json({ message: "Student registered successfully", userId: result.insertId });
  } catch (error) {
    console.error("Registration Error:", error);
    const isDev = process.env.NODE_ENV === 'development';
    res.status(500).json({ message: isDev ? error.message : "Registration failed. Please try again." });
  }
};

exports.login = async (req, res) => {
  const { email: loginIdentifier, password } = req.body;

  if (!loginIdentifier || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const cleanIdentifier = String(loginIdentifier).trim();
  const cleanPassword = String(password);

  if (cleanPassword.length > 128) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  try {
    const [users] = await db.execute(
      "SELECT * FROM users WHERE email = ? OR mobile = ?",
      [cleanIdentifier, cleanIdentifier]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(cleanPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    let detailedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mobile: user.mobile,
      profile_image: user.profile_image
    };

    if (user.role === 'student') {
      try {
        const [studentInfo] = await db.execute(`
          SELECT st.id as student_record_id, st.course_id, st.roll_no, 
                 COALESCE(st.roll_no_locked, (st.roll_no IS NOT NULL AND st.roll_no != '')) as roll_no_locked, 
                 st.session, st.current_semester,
                 c.name as course, d.name as department
          FROM students st
          LEFT JOIN courses c ON st.course_id = c.id
          LEFT JOIN departments d ON c.department_id = d.id
          WHERE st.user_id = ?`, [user.id]);
        if (studentInfo.length > 0) {
          detailedUser = { ...detailedUser, ...studentInfo[0] };
        }
      } catch (stErr) {
        try {
          const [fallbackInfo] = await db.execute(`
            SELECT st.id as student_record_id, st.course_id, st.roll_no, 
                   (st.roll_no IS NOT NULL AND st.roll_no != '') as roll_no_locked, 
                   st.session, st.current_semester,
                   c.name as course, d.name as department
            FROM students st
            LEFT JOIN courses c ON st.course_id = c.id
            LEFT JOIN departments d ON c.department_id = d.id
            WHERE st.user_id = ?`, [user.id]);
          if (fallbackInfo.length > 0) {
            detailedUser = { ...detailedUser, ...fallbackInfo[0] };
          }
        } catch (_ignore) {}
      }
    } else if (user.role === 'teacher') {
      try {
        const [staffInfo] = await db.execute(`
          SELECT st.id as staff_record_id, 
                 COALESCE(st.teacher_code, CONCAT('TCH-', st.id)) as teacher_code, 
                 st.department_id, st.designation, st.profession,
                 d.name as department
          FROM staff st
          LEFT JOIN departments d ON st.department_id = d.id
          WHERE st.user_id = ?`, [user.id]);
        if (staffInfo.length > 0) {
          detailedUser = { ...detailedUser, ...staffInfo[0] };
        }
      } catch (stfErr) {
        try {
          const [fallbackInfo] = await db.execute(`
            SELECT st.id as staff_record_id, 
                   CONCAT('TCH-', st.id) as teacher_code, 
                   st.department_id, st.designation, st.profession,
                   d.name as department
            FROM staff st
            LEFT JOIN departments d ON st.department_id = d.id
            WHERE st.user_id = ?`, [user.id]);
          if (fallbackInfo.length > 0) {
            detailedUser = { ...detailedUser, ...fallbackInfo[0] };
          }
        } catch (_ignore) {}
      }
    }

    // Generate JWT token with timestamp to ensure uniqueness per login
    const token = jwt.sign(
      { id: user.id, role: user.role, loginAt: Date.now() },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // FEATURE: Single active session per user.
    // Overwrite current_session_token in DB so any previous session on another device is invalidated.
    try {
      await db.execute(
        "UPDATE users SET current_session_token = ? WHERE id = ?",
        [token, user.id]
      );
    } catch (tokenErr) {
      console.error("Failed to update current_session_token:", tokenErr);
    }

    res.json({ token, user: detailedUser });
  } catch (error) {
    console.error("Login Error:", error);
    const isDev = process.env.NODE_ENV === 'development';
    res.status(500).json({ message: isDev ? error.message : "Server error during login" });
  }
};

/**
 * Verify session endpoint: validates token against DB and returns latest user details.
 */
exports.verify = async (req, res) => {
  try {
    const [users] = await db.execute(
      "SELECT id, name, email, mobile, role, profile_image FROM users WHERE id = ?",
      [req.user.id]
    );

    if (!users || users.length === 0) {
      return res.status(401).json({ code: "USER_NOT_FOUND", message: "User not found" });
    }

    const user = users[0];
    let detailedUser = { ...user };

    if (user.role === 'student') {
      const [studentInfo] = await db.execute(`
        SELECT st.id as student_record_id, st.course_id, st.roll_no, st.session, st.current_semester,
               c.name as course, d.name as department
        FROM students st
        LEFT JOIN courses c ON st.course_id = c.id
        LEFT JOIN departments d ON c.department_id = d.id
        WHERE st.user_id = ?`, [user.id]);
      if (studentInfo.length > 0) {
        detailedUser = { ...detailedUser, ...studentInfo[0] };
      }
    } else if (user.role === 'teacher') {
      const [staffInfo] = await db.execute(`
        SELECT st.id as staff_record_id, st.department_id, st.designation, st.profession,
               d.name as department
        FROM staff st
        LEFT JOIN departments d ON st.department_id = d.id
        WHERE st.user_id = ?`, [user.id]);
      if (staffInfo.length > 0) {
        detailedUser = { ...detailedUser, ...staffInfo[0] };
      }
    }

    res.json({ valid: true, user: detailedUser });
  } catch (error) {
    console.error("Verify Error:", error);
    const isDev = process.env.NODE_ENV === 'development';
    res.status(500).json({ message: isDev ? error.message : "Server Error verifying session" });
  }
};

/**
 * Logout: blacklists token and clears active session token in DB.
 */
exports.logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      blacklistToken(token);
    }
    if (req.user && req.user.id) {
      await db.execute(
        "UPDATE users SET current_session_token = NULL WHERE id = ?",
        [req.user.id]
      ).catch(() => {});
    }
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout Error:", error);
    const isDev = process.env.NODE_ENV === 'development';
    res.status(500).json({ message: isDev ? error.message : "Server Error during logout" });
  }
};

/**
 * Step 1: Request OTP for Forgot Password flow
 * Strictly available for Student and Teacher accounts only (NOT Admin).
 * Enforces 10-digit numeric mobile. Non-enumerating response.
 */
exports.requestOtp = async (req, res) => {
  const rawId = req.body?.identifier || req.body?.email || '';
  const rawMobile = req.body?.mobile || '';

  const cleanIdentifier = String(rawId).trim().toLowerCase();
  const cleanMobile = String(rawMobile).trim();

  if (!cleanIdentifier) {
    return res.status(400).json({ success: false, message: "Email or ID is required" });
  }

  // Mobile number MUST enforce exactly 10 digits, numeric only
  if (!MOBILE_REGEX.test(cleanMobile)) {
    return res.status(400).json({ success: false, message: "Mobile number must be exactly 10 digits" });
  }

  const genericResponse = {
    success: true,
    message: "If these details are correct, an OTP has been sent to your registered mobile number."
  };

  try {
    // Exclude 'admin' role explicitly
    const [users] = await db.execute(`
      SELECT u.id, u.email, u.mobile, u.role
      FROM users u
      LEFT JOIN students st ON st.user_id = u.id
      LEFT JOIN staff sf ON sf.user_id = u.id
      WHERE (LOWER(u.email) = ? OR u.mobile = ? OR LOWER(st.roll_no) = ? OR LOWER(sf.teacher_code) = ?)
        AND u.role IN ('student', 'teacher')
      LIMIT 1
    `, [cleanIdentifier, cleanMobile, cleanIdentifier, cleanIdentifier]);

    if (users.length > 0) {
      const user = users[0];
      // Verify submitted mobile matches account's registered mobile
      if (user.mobile && String(user.mobile).trim() === cleanMobile) {
        // Generate 6-digit numeric OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const ttlMs = 5 * 60 * 1000; // 5 minutes

        otpStore.set(user.id, {
          userId: user.id,
          otp,
          expiresAt: Date.now() + ttlMs,
          attempts: 0,
          mobile: cleanMobile,
          identifier: cleanIdentifier
        });

        // Send via SMS Service abstraction
        await sendOtpSms(cleanMobile, otp);
      }
    }

    // Always return generic non-enumerating message
    return res.status(200).json(genericResponse);
  } catch (error) {
    console.error("Request OTP Error:", error);
    // Even on server query errors, do not leak user state
    return res.status(200).json(genericResponse);
  }
};

/**
 * Step 2: Verify OTP
 * Max 5 failed attempts locks and deletes the OTP.
 * On success, issues a 10-minute password reset token.
 */
exports.verifyOtp = async (req, res) => {
  const rawId = req.body?.identifier || req.body?.email || '';
  const rawOtp = req.body?.otp || '';

  const cleanIdentifier = String(rawId).trim().toLowerCase();
  const cleanOtp = String(rawOtp).trim();

  if (!cleanIdentifier) {
    return res.status(400).json({ success: false, message: "Email or ID is required" });
  }

  if (!cleanOtp || !/^[0-9]{6}$/.test(cleanOtp)) {
    return res.status(400).json({ success: false, message: "A valid 6-digit OTP is required" });
  }

  try {
    const [users] = await db.execute(`
      SELECT u.id, u.email, u.mobile, u.role
      FROM users u
      LEFT JOIN students st ON st.user_id = u.id
      LEFT JOIN staff sf ON sf.user_id = u.id
      WHERE (LOWER(u.email) = ? OR u.mobile = ? OR LOWER(st.roll_no) = ? OR LOWER(sf.teacher_code) = ?)
        AND u.role IN ('student', 'teacher')
      LIMIT 1
    `, [cleanIdentifier, cleanIdentifier, cleanIdentifier, cleanIdentifier]);

    if (users.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP. Please request a new one." });
    }

    const user = users[0];
    const record = otpStore.get(user.id);

    if (!record) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP. Please request a new one." });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(user.id);
      return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
    }

    record.attempts += 1;
    if (record.attempts > 5) {
      otpStore.delete(user.id);
      return res.status(429).json({
        success: false,
        message: "Too many failed attempts. This OTP has been invalidated. Please request a new OTP."
      });
    }

    if (record.otp !== cleanOtp) {
      const remaining = Math.max(0, 5 - record.attempts);
      return res.status(400).json({
        success: false,
        message: remaining > 0
          ? `Incorrect OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : "Too many failed attempts. This OTP has been invalidated. Please request a new OTP."
      });
    }

    // OTP matched! Invalidate it so it is single-use
    otpStore.delete(user.id);

    // Issue short-lived (10-minute) reset token
    const jwtSecret = process.env.JWT_SECRET || 'cgc_jwt_secret_key_college_erp_2024';
    const resetToken = jwt.sign(
      { userId: user.id, purpose: 'password_reset' },
      jwtSecret,
      { expiresIn: '10m' }
    );

    activeResetTokens.set(resetToken, {
      userId: user.id,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      resetToken
    });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    return res.status(500).json({ success: false, message: "Server error verifying OTP" });
  }
};

/**
 * Step 3: Reset Password using single-use reset token
 * Validates reset token, updates password (bcrypt), invalidates token & sessions.
 */
exports.resetForgotPassword = async (req, res) => {
  const { resetToken, newPassword, confirmPassword } = req.body;

  if (!resetToken || typeof resetToken !== 'string') {
    return res.status(400).json({ success: false, message: "Password reset token is required" });
  }

  const tokenRecord = activeResetTokens.get(resetToken);
  if (!tokenRecord || Date.now() > tokenRecord.expiresAt) {
    activeResetTokens.delete(resetToken);
    return res.status(400).json({ success: false, message: "Reset token has expired or is invalid. Please request a new OTP." });
  }

  const jwtSecret = process.env.JWT_SECRET || 'cgc_jwt_secret_key_college_erp_2024';
  let decoded;
  try {
    decoded = jwt.verify(resetToken, jwtSecret);
    if (decoded.purpose !== 'password_reset' || decoded.userId !== tokenRecord.userId) {
      throw new Error("Invalid token payload");
    }
  } catch (err) {
    activeResetTokens.delete(resetToken);
    return res.status(400).json({ success: false, message: "Invalid or expired reset token." });
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: "New password must be at least 8 characters long"
    });
  }

  if (confirmPassword !== undefined && newPassword !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Passwords do not match"
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password AND invalidate current_session_token to log out all existing sessions
    await db.execute(
      "UPDATE users SET password = ?, current_session_token = NULL WHERE id = ?",
      [hashedPassword, tokenRecord.userId]
    );

    // Invalidate reset token so it can never be reused
    activeResetTokens.delete(resetToken);

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now log in with your new password."
    });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(500).json({ success: false, message: "Failed to reset password" });
  }
};

// Test helpers (only used in automated testing suite)
exports._getOtpForTesting = (userId) => otpStore.get(userId);
exports._setOtpForTesting = (userId, data) => otpStore.set(userId, data);
exports._clearOtpStoreForTesting = () => { otpStore.clear(); activeResetTokens.clear(); };

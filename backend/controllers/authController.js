const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { blacklistToken } = require("../middleware/auth");

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

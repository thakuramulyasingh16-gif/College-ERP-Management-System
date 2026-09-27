const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { blacklistToken } = require("../middleware/auth");

exports.register = async (req, res) => {
  const { name, email, mobile, password } = req.body;
  const role = 'student';

  if (!name || !email || !mobile || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const [existingUser] = await db.execute(
      "SELECT * FROM users WHERE email = ? OR mobile = ?",
      [email, mobile]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ 
        message: existingUser[0].email === email ? "Email already registered" : "Mobile number already registered" 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.execute(
      "INSERT INTO users (name, email, mobile, password, role) VALUES (?, ?, ?, ?, ?)",
      [name, email, mobile, hashedPassword, role]
    );

    res.status(201).json({ message: "Student registered successfully", userId: result.insertId });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ message: "Database Error: " + error.message });
  }
};

exports.login = async (req, res) => {
  const { email: loginIdentifier, password } = req.body;

  if (!loginIdentifier || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const [users] = await db.execute(
      "SELECT * FROM users WHERE email = ? OR mobile = ?",
      [loginIdentifier.trim(), loginIdentifier.trim()]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(password, user.password);
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
    res.status(500).json({ message: "Server Error" });
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
    res.status(500).json({ message: "Server Error verifying session" });
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
    res.status(500).json({ message: "Server Error during logout" });
  }
};

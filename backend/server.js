const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const erpRoutes = require('./routes/erpRoutes');
const db = require('./config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const path = require('path');

dotenv.config();
const app = express();

// Database Connection Test
db.getConnection()
  .then(connection => {
    console.log("DB Connected Successfully");
    connection.release();
  })
  .catch(err => {
    console.error("DB CONNECTION ERROR:", err.message);
  });

app.use(cors({
  origin: "https://college-erp-management-system-1.onrender.com",
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Debug middleware
app.use((req, res, next) => {
  console.log(`API HIT: ${req.method} ${req.url}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api', erpRoutes);

app.post("/api/login", async (req, res) => {
  let { email, password } = req.body;
  email = email ? email.trim() : "";
  password = password ? password.trim() : "";

  const query = `
    SELECT u.*, 
    stf.id as staff_record_id,
    std.id as student_record_id,
    COALESCE(stf.department_id, c.department_id) as department_id,
    d.name as department
    FROM users u
    LEFT JOIN staff stf ON u.id = stf.user_id AND u.role = 'teacher'
    LEFT JOIN students std ON u.id = std.user_id AND u.role = 'student'
    LEFT JOIN courses c ON std.course_id = c.id
    LEFT JOIN departments d ON COALESCE(stf.department_id, c.department_id) = d.id
    WHERE u.email = ?
  `;

  try {
    const [rows] = await db.query(query, [email]);

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid email" });
    }

    const user = rows[0];

    // Check if password is hashed or plain text
    const isMatch = user.password.startsWith('$2') 
      ? await bcrypt.compare(password, user.password)
      : user.password === password;

    if (!isMatch) {
      console.log("LOGIN FAILED: Password mismatch for", email);
      return res.status(401).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department_id: user.department_id || null,
        department: user.department || null,
        staff_record_id: user.staff_record_id || null,
        student_record_id: user.student_record_id || null
      }
    });
  } catch (err) {
    console.error("LOGIN DB ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.get('/', (req, res) => {
  res.send('College ERP API is running...');
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ message: 'Internal Server Error', error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});

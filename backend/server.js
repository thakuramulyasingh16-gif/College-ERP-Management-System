const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const erpRoutes = require('./routes/erpRoutes');
const uploadAuth = require('./middleware/uploadAuth');
const db = require('./config/db');
const path = require('path');

dotenv.config();
const app = express();

// Security: standard security headers with cross-origin asset support
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false // Allows frontend to render assets across deployment domains
}));

// Database Connection Test & Auto-Schema Migration
db.getConnection()
  .then(async (connection) => {
    console.log("DB Connected Successfully");

    // 1. users.current_session_token
    try {
      await connection.query("ALTER TABLE users ADD COLUMN current_session_token TEXT DEFAULT NULL");
      console.log("users.current_session_token verified/added.");
    } catch (colErr) { /* column exists */ }

    // 2. staff.teacher_code
    try {
      const [staffCols] = await connection.query("SHOW COLUMNS FROM staff LIKE 'teacher_code'");
      if (staffCols.length === 0) {
        await connection.query("ALTER TABLE staff ADD COLUMN teacher_code VARCHAR(30) NULL AFTER user_id");
        await connection.query("UPDATE staff SET teacher_code = CONCAT('TCH-', id) WHERE teacher_code IS NULL OR teacher_code = ''");
        try {
          await connection.query("ALTER TABLE staff MODIFY COLUMN teacher_code VARCHAR(30) UNIQUE NOT NULL");
        } catch (uErr) {
          console.warn("staff.teacher_code UNIQUE modify notice:", uErr.message);
        }
        console.log("staff.teacher_code column added and backfilled.");
      } else {
        await connection.query("UPDATE staff SET teacher_code = CONCAT('TCH-', id) WHERE teacher_code IS NULL OR teacher_code = ''");
      }
    } catch (err) {
      console.error("Auto-migration staff.teacher_code error:", err.message);
    }

    // 3. students.roll_no (allow NULL)
    try {
      await connection.query("ALTER TABLE students MODIFY COLUMN roll_no VARCHAR(20) UNIQUE NULL");
      console.log("students.roll_no modified to NULL-able.");
    } catch (err) {
      console.error("Auto-migration students.roll_no modify error:", err.message);
    }

    // 4. students.roll_no_locked
    try {
      const [studentCols] = await connection.query("SHOW COLUMNS FROM students LIKE 'roll_no_locked'");
      if (studentCols.length === 0) {
        await connection.query("ALTER TABLE students ADD COLUMN roll_no_locked BOOLEAN NOT NULL DEFAULT FALSE");
        await connection.query("UPDATE students SET roll_no_locked = TRUE WHERE roll_no IS NOT NULL AND roll_no != ''");
        console.log("students.roll_no_locked column added and backfilled.");
      } else {
        await connection.query("UPDATE students SET roll_no_locked = FALSE WHERE roll_no_locked IS NULL");
      }
    } catch (err) {
      console.error("Auto-migration students.roll_no_locked error:", err.message);
    }

    connection.release();
  })
  .catch(err => {
    console.error("DB CONNECTION ERROR:", err.message);
  });

// Allowed origins: production frontend + local development
const allowedOrigins = [
  "https://college-erp-management-system-1.onrender.com",
  "https://college-erp-management-system-a9xk.onrender.com",
  "http://localhost:5173",
  "http://localhost:3000"
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. server-to-server, curl, Postman, health checks)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS policy: origin not allowed"));
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Protected uploads: requires valid JWT (via Bearer header or ?token= query param)
app.use('/uploads', uploadAuth, express.static(path.join(__dirname, 'uploads')));

// Security: prevent browsers from caching authenticated API responses
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Non-sensitive request logging
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`API HIT: ${req.method} ${req.path}`);
    next();
  });
}

// Auth routes: /api/auth/login, /api/auth/logout, /api/auth/register
app.use('/api/auth', authRoutes);

// All ERP business routes (all protected by auth middleware in erpRoutes.js)
app.use('/api', erpRoutes);

// Polling endpoint for single active session check
const authMiddleware = require('./middleware/auth');
app.get('/api/session/check', authMiddleware(), (req, res) => res.json({ valid: true }));

app.get('/', (req, res) => {
  res.send('College ERP API is running...');
});

// Global error handler - never leaks internal database or stack errors in production
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err.stack || err);
  const isDev = process.env.NODE_ENV === 'development';
  const statusCode = err.status || (err.message && err.message.includes('CORS') ? 403 : 500);
  
  res.status(statusCode).json({
    message: isDev ? err.message : (statusCode === 403 ? 'CORS request blocked' : 'Internal Server Error')
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});

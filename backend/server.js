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

// Database Connection Test
db.getConnection()
  .then(async (connection) => {
    console.log("DB Connected Successfully");
    try {
      await connection.query("ALTER TABLE users ADD COLUMN current_session_token TEXT DEFAULT NULL");
      console.log("users.current_session_token verified/added.");
    } catch (colErr) { /* column exists */ }
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

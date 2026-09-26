const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const erpRoutes = require('./routes/erpRoutes');
const db = require('./config/db');
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

// Allowed origins: production frontend + local development
const allowedOrigins = [
  "https://college-erp-management-system-1.onrender.com",
  "http://localhost:5173",
  "http://localhost:3000"
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. server-to-server, curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS policy: origin not allowed"));
  },
  credentials: true
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Security: prevent browsers from caching authenticated API responses
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Debug middleware (development only — safe to remove in production)
app.use((req, res, next) => {
  console.log(`API HIT: ${req.method} ${req.url}`);
  next();
});

// Auth routes: /api/auth/login, /api/auth/logout, /api/auth/register
app.use('/api/auth', authRoutes);

// All ERP business routes (all protected by auth middleware in erpRoutes.js)
app.use('/api', erpRoutes);

// NOTE: The old duplicate /api/login endpoint has been removed.
// All login requests must go through /api/auth/login which uses bcrypt exclusively.

app.get('/', (req, res) => {
  res.send('College ERP API is running...');
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});

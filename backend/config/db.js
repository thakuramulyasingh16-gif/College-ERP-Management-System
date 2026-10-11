const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Root directory (backend folder) se certificate read karein
const caCertPath = path.join(__dirname, '../isrgrootx1.pem');

const enableSsl = process.env.TIDB_ENABLE_SSL !== 'false' && process.env.DB_SSL !== 'false' && fs.existsSync(caCertPath);

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 4000,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectTimeout: 20000,
  ssl: enableSsl ? {
    ca: fs.readFileSync(caCertPath),
    rejectUnauthorized: true,
  } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool.promise();

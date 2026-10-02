const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@college.com';
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || adminPassword.trim().length === 0) {
    console.error('ERROR: ADMIN_PASSWORD environment variable is required to seed an admin account.');
    console.error('Usage: ADMIN_PASSWORD="your-strong-password" node seed-admin.js');
    process.exit(1);
  }

  if (adminPassword.length < 8) {
    console.error('ERROR: ADMIN_PASSWORD must be at least 8 characters long.');
    process.exit(1);
  }

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT) || 4000
    });

    console.log('Connected to Database...');

    // Check if admin already exists
    const [rows] = await connection.execute('SELECT id, email FROM users WHERE email = ?', [adminEmail]);

    if (rows.length > 0) {
      console.log(`Admin account with email "${adminEmail}" already exists.`);
    } else {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await connection.execute(
        'INSERT INTO users (name, email, mobile, password, role) VALUES (?, ?, ?, ?, ?)',
        ['System Admin', adminEmail, '0000000000', hashedPassword, 'admin']
      );
      console.log('==========================================');
      console.log('ADMIN ACCOUNT CREATED SUCCESSFULLY');
      console.log('Email: ' + adminEmail);
      console.log('Password has been securely set from ADMIN_PASSWORD.');
      console.log('==========================================');
    }
  } catch (err) {
    console.error('Error seeding admin:', err.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seedAdmin();
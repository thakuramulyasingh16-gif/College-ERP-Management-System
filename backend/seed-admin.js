const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seedAdmin() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('Connected to Database...');

    const adminEmail = 'admin@college.com';
    const adminPassword = 'Admin@123'; // You should change this after first login
    
    // Check if admin already exists
    const [rows] = await connection.execute('SELECT * FROM users WHERE email = ?', [adminEmail]);
    
    if (rows.length > 0) {
      console.log('Admin already exists.');
    } else {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await connection.execute(
        'INSERT INTO users (name, email, mobile, password, role) VALUES (?, ?, ?, ?, ?)',
        ['System Admin', adminEmail, '0000000000', hashedPassword, 'admin']
      );
      console.log('==========================================');
      console.log('ADMIN ACCOUNT CREATED SUCCESSFULLY');
      console.log('Email: ' + adminEmail);
      console.log('Password: ' + adminPassword);
      console.log('==========================================');
      console.log('Please log in and change your password immediately.');
    }

    await connection.end();
  } catch (err) {
    console.error('Error seeding admin:', err.message);
  }
}

seedAdmin();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function test() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      multipleStatements: true
    });
    console.log('Connected to MySQL!');
    
    const dbName = process.env.DB_NAME || 'erp_db';
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    console.log(`Database ${dbName} checked/created.`);
    
    await connection.changeUser({ database: dbName });
    
    const schemaPath = path.join(__dirname, '../College ERP/schema.sql');
    let schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Strip BOM if present
    if (schema.charCodeAt(0) === 0xFEFF) {
      schema = schema.slice(1);
    }
    
    const queries = schema.split(';').map(q => q.trim()).filter(q => q !== '');
    for (let query of queries) {
      if (query.toLowerCase().startsWith('use ')) continue;
      await connection.query(query);
    }
    
    console.log('Tables checked/created successfully.');
    await connection.end();
  } catch (err) {
    console.error('ERROR:', err.message);
  }
}
test();

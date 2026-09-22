const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// CA सर्टिफिकेट पाथ (backend फोल्डर में स्थित isrgrootx1.pem के लिए)
const caCertPath = path.join(__dirname, 'isrgrootx1.pem');

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT || 4000,
        database: process.env.DB_NAME,
        multipleStatements: true,
        ssl: {
            ca: fs.existsSync(caCertPath) ? fs.readFileSync(caCertPath) : undefined,
            rejectUnauthorized: true,
        }
    });

    console.log('Connected to MySQL.');

    const sqlPath = path.join(__dirname, '..', 'databases', 'schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    try {
        await connection.query(sql);
        console.log('Database migration successful.');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

migrate();

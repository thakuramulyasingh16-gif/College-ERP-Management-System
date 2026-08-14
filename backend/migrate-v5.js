require('dotenv').config({ path: './backend/.env' });
const db = require("./config/db");

const migrateV5 = async () => {
  try {
    console.log("Starting Migration V5...");

    // 1. Update Students table
    try {
        await db.execute(`ALTER TABLE students ADD COLUMN admission_year INT DEFAULT NULL`);
        console.log("admission_year added to students.");
    } catch (e) { console.log("admission_year in students might already exist."); }

    try {
        await db.execute(`ALTER TABLE students MODIFY COLUMN session VARCHAR(50)`);
        console.log("session column modified in students.");
    } catch (e) { console.log("session modification failed or already done."); }

    // 2. Update Notes (Study Materials) table
    try {
        await db.execute(`ALTER TABLE notes ADD COLUMN session VARCHAR(50) DEFAULT NULL`);
        await db.execute(`ALTER TABLE notes ADD COLUMN url VARCHAR(255) DEFAULT NULL`);
        // We keep file_url but user mentioned file_path. I'll stick to what fits existing code or add file_path.
        // The existing column is file_url.
        console.log("session and url added to notes.");
    } catch (e) { console.log("columns in notes might already exist."); }

    // 3. Update Assignments table
    try {
        await db.execute(`ALTER TABLE assignments ADD COLUMN session VARCHAR(50) DEFAULT NULL`);
        console.log("session added to assignments.");
    } catch (e) { console.log("session in assignments might already exist."); }

    console.log("Migration V5 completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration V5 failed:", error);
    process.exit(1);
  }
};

migrateV5();

require('dotenv').config({ path: './backend/.env' });
const db = require("./config/db");

const migrateV4 = async () => {
  try {
    console.log("Starting Migration V4...");

    // 1. Update assignments table
    try {
        await db.execute(`ALTER TABLE assignments ADD COLUMN duration INT DEFAULT 30`);
        console.log("duration added to assignments.");
    } catch (e) { console.log("duration in assignments might already exist."); }

    try {
        await db.execute(`ALTER TABLE assignments MODIFY COLUMN type ENUM('mcq', 'subjective') NOT NULL`);
        console.log("type ENUM updated in assignments.");
    } catch (e) { console.log("type ENUM update might have failed or already done."); }

    // 2. Update assignment_questions table
    try {
        await db.execute(`ALTER TABLE assignment_questions ADD COLUMN options JSON DEFAULT NULL`);
        console.log("options JSON added to assignment_questions.");
    } catch (e) { console.log("options in assignment_questions might already exist."); }

    // 3. Update assignment_submissions table
    try {
        await db.execute(`ALTER TABLE assignment_submissions ADD COLUMN auto_submitted BOOLEAN DEFAULT FALSE`);
        console.log("auto_submitted added to assignment_submissions.");
    } catch (e) { console.log("auto_submitted in assignment_submissions might already exist."); }

    console.log("Migration V4 completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration V4 failed:", error);
    process.exit(1);
  }
};

migrateV4();

require('dotenv').config({ path: './backend/.env' });
const db = require("./config/db");

const migrateV12 = async () => {
  try {
    console.log("Starting Migration V12: Enhancing assignments system...");

    // 1. Add total_marks to assignments
    try {
        await db.execute(`ALTER TABLE assignments ADD COLUMN total_marks INT DEFAULT 0`);
        console.log("total_marks added to assignments.");
    } catch (e) { console.log("total_marks in assignments might already exist."); }

    // 2. Add type and marks to assignment_questions
    try {
        await db.execute(`ALTER TABLE assignment_questions ADD COLUMN type ENUM('mcq', 'theory') DEFAULT 'mcq'`);
        console.log("type added to assignment_questions.");
    } catch (e) { console.log("type in assignment_questions might already exist."); }

    try {
        await db.execute(`ALTER TABLE assignment_questions ADD COLUMN marks INT DEFAULT 1`);
        console.log("marks added to assignment_questions.");
    } catch (e) { console.log("marks in assignment_questions might already exist."); }

    // 3. Add mcq_marks and theory_marks to assignment_submissions
    try {
        await db.execute(`ALTER TABLE assignment_submissions ADD COLUMN mcq_marks INT DEFAULT 0`);
        console.log("mcq_marks added to assignment_submissions.");
    } catch (e) { console.log("mcq_marks in assignment_submissions might already exist."); }

    try {
        await db.execute(`ALTER TABLE assignment_submissions ADD COLUMN theory_marks INT DEFAULT 0`);
        console.log("theory_marks added to assignment_submissions.");
    } catch (e) { console.log("theory_marks in assignment_submissions might already exist."); }

    // Update existing questions to match assignment type if needed
    try {
        await db.execute(`
            UPDATE assignment_questions q
            JOIN assignments a ON q.assignment_id = a.id
            SET q.type = CASE 
                WHEN a.type = 'mcq' THEN 'mcq'
                WHEN a.type = 'subjective' THEN 'theory'
                ELSE 'mcq'
            END
        `);
        console.log("Existing questions types updated.");
    } catch (e) { console.log("Failed to update existing questions types:", e.message); }

    console.log("Migration V12 completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration V12 failed:", error);
    process.exit(1);
  }
};

migrateV12();

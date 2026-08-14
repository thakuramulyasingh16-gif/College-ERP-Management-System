require('dotenv').config({ path: './backend/.env' });
const db = require("./config/db");

const migrateV8 = async () => {
  try {
    console.log("Starting Migration V8: Enhancing Subjects table...");

    try {
        await db.execute(`ALTER TABLE subjects ADD COLUMN subject_code VARCHAR(50) DEFAULT NULL`);
        console.log("subject_code added to subjects.");
    } catch (e) { console.log("subject_code in subjects might already exist."); }

    try {
        await db.execute(`ALTER TABLE subjects ADD COLUMN session VARCHAR(50) DEFAULT NULL`);
        console.log("session added to subjects.");
    } catch (e) { console.log("session in subjects might already exist."); }

    try {
        await db.execute(`ALTER TABLE subjects ADD COLUMN teacher_id INT DEFAULT NULL`);
        await db.execute(`ALTER TABLE subjects ADD FOREIGN KEY (teacher_id) REFERENCES staff(id) ON DELETE SET NULL`);
        console.log("teacher_id added to subjects.");
    } catch (e) { console.log("teacher_id in subjects might already exist."); }

    console.log("Migration V8 completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration V8 failed:", error);
    process.exit(1);
  }
};

migrateV8();

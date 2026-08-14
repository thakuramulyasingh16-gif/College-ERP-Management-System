require('dotenv').config({ path: './backend/.env' });
const db = require("./config/db");

const migrateV10 = async () => {
  try {
    console.log("Starting Migration V10: Fixing results and attendance tables...");

    // 1. Update results table
    try {
        await db.execute(`ALTER TABLE results ADD COLUMN course_id INT DEFAULT NULL`);
        await db.execute(`ALTER TABLE results ADD FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL`);
        console.log("course_id added to results.");
    } catch (e) { console.log("course_id in results might already exist."); }

    try {
        await db.execute(`ALTER TABLE results ADD COLUMN session VARCHAR(50) DEFAULT NULL`);
        console.log("session added to results.");
    } catch (e) { console.log("session in results might already exist."); }

    try {
        await db.execute(`ALTER TABLE results ADD COLUMN exam_name VARCHAR(100) DEFAULT NULL`);
        console.log("exam_name added to results.");
    } catch (e) { console.log("exam_name in results might already exist."); }

    // 2. Update attendance table
    try {
        await db.execute(`ALTER TABLE attendance ADD COLUMN teacher_id INT DEFAULT NULL`);
        await db.execute(`ALTER TABLE attendance ADD FOREIGN KEY (teacher_id) REFERENCES staff(id) ON DELETE SET NULL`);
        console.log("teacher_id added to attendance.");
    } catch (e) { console.log("teacher_id in attendance might already exist."); }

    try {
        await db.execute(`ALTER TABLE attendance ADD COLUMN course_id INT DEFAULT NULL`);
        await db.execute(`ALTER TABLE attendance ADD FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL`);
        console.log("course_id added to attendance.");
    } catch (e) { console.log("course_id in attendance might already exist."); }

    try {
        await db.execute(`ALTER TABLE attendance ADD COLUMN time TIME DEFAULT NULL`);
        console.log("time added to attendance.");
    } catch (e) { console.log("time in attendance might already exist."); }

    try {
        await db.execute(`ALTER TABLE attendance ADD COLUMN session VARCHAR(50) DEFAULT NULL`);
        console.log("session added to attendance.");
    } catch (e) { console.log("session in attendance might already exist."); }

    console.log("Migration V10 completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration V10 failed:", error);
    process.exit(1);
  }
};

migrateV10();

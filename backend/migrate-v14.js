require('dotenv').config({ path: './backend/.env' });
const db = require("./config/db");

const migrateV14 = async () => {
  try {
    console.log("Starting Migration V14: Adding teacher_code to staff and updating students roll_no...");

    // 1. Add teacher_code to staff table
    try {
      const [cols] = await db.execute("SHOW COLUMNS FROM staff LIKE 'teacher_code'");
      if (cols.length === 0) {
        await db.execute("ALTER TABLE staff ADD COLUMN teacher_code VARCHAR(30) NULL AFTER user_id");
        // Backfill any existing staff without code
        await db.execute("UPDATE staff SET teacher_code = CONCAT('TCH-', id) WHERE teacher_code IS NULL OR teacher_code = ''");
        await db.execute("ALTER TABLE staff MODIFY COLUMN teacher_code VARCHAR(30) UNIQUE NOT NULL");
        console.log("SUCCESS: teacher_code added to staff table as UNIQUE NOT NULL.");
      } else {
        console.log("INFO: teacher_code column already exists in staff table.");
      }
    } catch (e) {
      console.log("INFO: staff table teacher_code migration handled:", e.message);
    }

    // 2. Modify students roll_no to allow NULL
    try {
      await db.execute("ALTER TABLE students MODIFY COLUMN roll_no VARCHAR(20) UNIQUE NULL");
      console.log("SUCCESS: students roll_no modified to UNIQUE NULL.");
    } catch (e) {
      console.log("INFO: students roll_no modify handled:", e.message);
    }

    // 3. Add roll_no_locked to students table
    try {
      const [cols] = await db.execute("SHOW COLUMNS FROM students LIKE 'roll_no_locked'");
      if (cols.length === 0) {
        await db.execute("ALTER TABLE students ADD COLUMN roll_no_locked BOOLEAN NOT NULL DEFAULT FALSE");
        // If existing students already have roll numbers, lock them so they cannot be arbitrarily edited
        await db.execute("UPDATE students SET roll_no_locked = TRUE WHERE roll_no IS NOT NULL AND roll_no != ''");
        console.log("SUCCESS: roll_no_locked added to students table.");
      } else {
        console.log("INFO: roll_no_locked column already exists in students table.");
      }
    } catch (e) {
      console.log("INFO: students table roll_no_locked migration handled:", e.message);
    }

    console.log("Migration V14 completed successfully.");
  } catch (err) {
    console.error("Migration V14 failed:", err);
  } finally {
    process.exit(0);
  }
};

migrateV14();

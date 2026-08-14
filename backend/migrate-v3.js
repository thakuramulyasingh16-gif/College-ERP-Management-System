require('dotenv').config({ path: './backend/.env' });
const db = require("./config/db");

const migrateV3 = async () => {
  try {
    console.log("Starting Migration V3...");

    // 1. Create Sessions table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_name VARCHAR(50) NOT NULL UNIQUE,
        duration_years INT NOT NULL
      )
    `);
    console.log("Sessions table created.");

    // 2. Modify Students table to link session_id
    try {
        await db.execute(`ALTER TABLE students ADD COLUMN session_id INT DEFAULT NULL`);
        await db.execute(`ALTER TABLE students ADD FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL`);
        console.log("session_id added to students.");
    } catch (e) { console.log("session_id in students might already exist."); }

    // 3. Modify Notes table to link course_id (Fixing study material blank issue)
    try {
        await db.execute(`ALTER TABLE notes ADD COLUMN course_id INT DEFAULT NULL`);
        await db.execute(`ALTER TABLE notes ADD FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE`);
        console.log("course_id added to notes.");
    } catch (e) { console.log("course_id in notes might already exist."); }

    // 4. Create Assignments table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT,
        session_id INT,
        teacher_id INT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type ENUM('mcq', 'written') NOT NULL,
        due_date TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (teacher_id) REFERENCES staff(id) ON DELETE CASCADE
      )
    `);
    console.log("Assignments table created.");

    // 5. Create Assignment Questions table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS assignment_questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        assignment_id INT,
        question_text TEXT NOT NULL,
        option_a TEXT,
        option_b TEXT,
        option_c TEXT,
        option_d TEXT,
        correct_option VARCHAR(1),
        FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE
      )
    `);
    console.log("Assignment Questions table created.");

    // 6. Create Assignment Submissions table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS assignment_submissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        assignment_id INT,
        student_id INT,
        answers JSON,
        marks_obtained INT DEFAULT NULL,
        remarks TEXT,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        evaluated_at TIMESTAMP NULL,
        FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      )
    `);
    console.log("Assignment Submissions table created.");

    // 7. Add session_id to Attendance (optional but good for filtering)
    try {
        await db.execute(`ALTER TABLE attendance ADD COLUMN session_id INT DEFAULT NULL`);
        await db.execute(`ALTER TABLE attendance ADD FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL`);
        console.log("session_id added to attendance.");
    } catch (e) { console.log("session_id in attendance might already exist."); }

    // Seed some sessions
    const sessions = [
        { name: '2023-26', dur: 3 },
        { name: '2024-27', dur: 3 },
        { name: '2023-25', dur: 2 },
        { name: '2024-26', dur: 2 }
    ];
    for (const s of sessions) {
        await db.execute("INSERT IGNORE INTO sessions (session_name, duration_years) VALUES (?, ?)", [s.name, s.dur]);
    }
    console.log("Sessions seeded.");

    console.log("Migration V3 completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration V3 failed:", error);
    process.exit(1);
  }
};

migrateV3();

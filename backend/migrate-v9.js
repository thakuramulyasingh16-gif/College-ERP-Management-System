require('dotenv').config({ path: './backend/.env' });
const db = require("./config/db");

const migrateV9 = async () => {
  try {
    console.log("Starting Migration V9: Creating Marks table...");

    await db.execute(`
        CREATE TABLE IF NOT EXISTS marks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            subject VARCHAR(255) NOT NULL,
            marks INT NOT NULL,
            course VARCHAR(255),
            session VARCHAR(50),
            exam_name VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
        )
    `);

    console.log("Migration V9 completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration V9 failed:", error);
    process.exit(1);
  }
};

migrateV9();

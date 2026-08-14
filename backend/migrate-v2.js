require('dotenv').config({ path: './backend/.env' });
const db = require("./config/db");

const migrateV2 = async () => {
  try {
    console.log("Starting Migration V2...");

    // 1. Update Fees table to include payment details
    try {
        await db.execute(`ALTER TABLE fees ADD COLUMN payment_method VARCHAR(50) DEFAULT NULL`);
        console.log("payment_method added.");
    } catch (e) { console.log("payment_method might already exist."); }

    try {
        await db.execute(`ALTER TABLE fees ADD COLUMN transaction_id VARCHAR(100) DEFAULT NULL`);
        console.log("transaction_id added.");
    } catch (e) { console.log("transaction_id might already exist."); }

    // 2. Create Complaints table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS complaints (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        role ENUM('student', 'teacher') NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log("Complaints table created.");

    // 3. Seed Departments (if not exist)
    const departments = [
      'Arts', 'Science / Agriculture', 'Commerce', 'Management', 
      'Computer Science (IT)', 'Education', 'Law', 'Computer Science / Engineering'
    ];

    for (const dept of departments) {
      await db.execute("INSERT IGNORE INTO departments (name) VALUES (?)", [dept]);
    }
    console.log("Departments seeded.");

    // 4. Seed Courses
    const courses = [
      { name: 'B.A.', dept: 'Arts', duration: 3 },
      { name: 'B.Sc.', dept: 'Science / Agriculture', duration: 3 },
      { name: 'B.Com', dept: 'Commerce', duration: 3 },
      { name: 'BBA', dept: 'Management', duration: 3 },
      { name: 'BCA', dept: 'Computer Science (IT)', duration: 3 },
      { name: 'B.El.Ed', dept: 'Education', duration: 4 },
      { name: 'M.A.', dept: 'Arts', duration: 2 },
      { name: 'M.Sc.', dept: 'Science', duration: 2 },
      { name: 'M.Com', dept: 'Commerce', duration: 2 },
      { name: 'MBA', dept: 'Management', duration: 2 },
      { name: 'MCA', dept: 'Computer Science (IT)', duration: 2 },
      { name: 'LLM', dept: 'Law', duration: 2 },
      { name: 'M.Tech', dept: 'Computer Science / Engineering', duration: 2 },
      { name: 'M.Ed', dept: 'Education', duration: 2 }
    ];

    const [allDepts] = await db.execute("SELECT id, name FROM departments");
    const deptMap = allDepts.reduce((acc, d) => {
      acc[d.name] = d.id;
      return acc;
    }, {});

    for (const course of courses) {
      const deptId = deptMap[course.dept];
      if (deptId) {
        await db.execute(
          "INSERT IGNORE INTO courses (name, department_id, duration_years) VALUES (?, ?, ?)",
          [course.name, deptId, course.duration]
        );
      }
    }
    console.log("Courses seeded.");

    console.log("Migration V2 completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration V2 failed:", error);
    process.exit(1);
  }
};

migrateV2();

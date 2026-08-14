const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    const hashedAdminPwd = await bcrypt.hash('admin123', 10);
    const hashedTeacherPwd = await bcrypt.hash('teacher123', 10);
    const hashedStudentPwd = await bcrypt.hash('student123', 10);
    
    await db.execute("SET FOREIGN_KEY_CHECKS = 0");
    await db.execute("TRUNCATE TABLE notices");
    await db.execute("TRUNCATE TABLE notes");
    await db.execute("TRUNCATE TABLE results");
    await db.execute("TRUNCATE TABLE fees");
    await db.execute("TRUNCATE TABLE fee_structures");
    await db.execute("TRUNCATE TABLE attendance");
    await db.execute("TRUNCATE TABLE teacher_subjects");
    await db.execute("TRUNCATE TABLE staff");
    await db.execute("TRUNCATE TABLE students");
    await db.execute("TRUNCATE TABLE subjects");
    await db.execute("TRUNCATE TABLE courses");
    await db.execute("TRUNCATE TABLE departments");
    await db.execute("TRUNCATE TABLE users");
    await db.execute("SET FOREIGN_KEY_CHECKS = 1");

    // 1. Admin
    await db.execute(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      ['City Group Admin', 'admin@citycolleges.info', hashedAdminPwd, 'admin']
    );

    // 2. Departments
    const departments = [
      'Law', 'Management', 'Pharmacy', 'Nursing', 
      'Computer Science (IT)', 'Commerce', 'Arts', 
      'Science (Agriculture)', 'Education'
    ];
    
    const deptIds = {};
    for (const d of departments) {
      const [res] = await db.execute("INSERT INTO departments (name) VALUES (?)", [d]);
      deptIds[d] = res.insertId;
    }

    // 3. Sample Courses
    const courses = [
      { name: 'LL.B', dept: 'Law', years: 3 },
      { name: 'MBA', dept: 'Management', years: 2 },
      { name: 'B.Pharm', dept: 'Pharmacy', years: 4 },
      { name: 'BCA', dept: 'Computer Science (IT)', years: 3 },
      { name: 'B.Sc Agriculture', dept: 'Science (Agriculture)', years: 4 },
    ];

    const courseIds = {};
    for (const c of courses) {
      const [res] = await db.execute(
        "INSERT INTO courses (name, department_id, duration_years) VALUES (?, ?, ?)",
        [c.name, deptIds[c.dept], c.years]
      );
      courseIds[c.name] = res.insertId;
    }

    // 4. Sample Subjects for BCA
    const subjects = [
      { name: 'Web Development', sem: 3 },
      { name: 'Database Systems', sem: 3 },
    ];
    for (const s of subjects) {
      await db.execute(
        "INSERT INTO subjects (name, course_id, semester) VALUES (?, ?, ?)",
        [s.name, courseIds['BCA'], s.sem]
      );
    }

    // 5. Sample Teacher
    const [tUser] = await db.execute(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      ['Dr. Vikram Singh', 'vikram@citycolleges.info', hashedTeacherPwd, 'teacher']
    );
    await db.execute(
      "INSERT INTO staff (user_id, department_id, designation) VALUES (?, ?, ?)",
      [tUser.insertId, deptIds['Computer Science (IT)'], 'Associate Professor']
    );

    // 6. Sample Student
    const [sUser] = await db.execute(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      ['Amit Kumar', 'amit@citycolleges.info', hashedStudentPwd, 'student']
    );
    await db.execute(
      "INSERT INTO students (user_id, course_id, roll_no, session) VALUES (?, ?, ?, ?)",
      [sUser.insertId, courseIds['BCA'], 'CGC-BCA-2023-01', '2023-26']
    );

    // 7. Notice
    await db.execute(
      "INSERT INTO notices (title, content, target_role) VALUES (?, ?, ?)",
      ['Welcome to City Group of Colleges', 'Official ERP for City Group of Colleges is now live.', 'all']
    );

    console.log('Seeding completed for City Group of Colleges ERP!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();

const db = require('./config/db');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const indianFirstNames = [
  "Aravind", "Rajesh", "Suresh", "Priya", "Ananya", "Vikram", "Aditya", "Sneha", "Rohan", "Neha",
  "Rahul", "Pooja", "Deepak", "Kavita", "Manish", "Shweta", "Arjun", "Meera", "Sanjay", "Anita",
  "Amit", "Sunita", "Vijay", "Rekha", "Karan", "Sonal", "Abhishek", "Ritu", "Sandeep", "Maya"
];

const indianLastNames = [
  "Sharma", "Verma", "Gupta", "Singh", "Kumar", "Patil", "Iyer", "Reddy", "Joshi", "Nair",
  "Choudhury", "Mishra", "Pandey", "Deshmukh", "Kulkarni", "Banerjee", "Chatterjee", "Bose", "Mehta", "Shah"
];

const professions = ["Professor", "Assistant Professor", "Lecturer"];

async function seedTeachers() {
  try {
    console.log("Starting Teacher Seeding...");

    // 1. Ensure 'profession' column exists in 'staff' table
    try {
      await db.execute("ALTER TABLE staff ADD COLUMN profession VARCHAR(100) AFTER designation");
      console.log("Added 'profession' column to 'staff' table.");
    } catch (err) {
      if (err.code === 'ER_DUP_COLUMN_NAME') {
        console.log("'profession' column already exists.");
      } else {
        throw err;
      }
    }

    // 2. Fetch departments
    const [departments] = await db.execute("SELECT id, name FROM departments");
    if (departments.length === 0) {
      throw new Error("No departments found in the database. Please seed departments first.");
    }

    const hashedPassword = await bcrypt.hash("pass123", 10);

    const usedEmails = new Set();
    const usedMobiles = new Set();

    // Fetch existing emails and mobiles to avoid duplicates
    const [existingUsers] = await db.execute("SELECT email, mobile FROM users");
    existingUsers.forEach(u => {
      if (u.email) usedEmails.add(u.email.toLowerCase());
      if (u.mobile) usedMobiles.add(u.mobile);
    });

    let count = 0;
    while (count < 20) {
      const firstName = indianFirstNames[Math.floor(Math.random() * indianFirstNames.length)];
      const lastName = indianLastNames[Math.floor(Math.random() * indianLastNames.length)];
      const name = `${firstName} ${lastName}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 1000)}@gmail.com`;
      const mobile = `9${Math.floor(100000000 + Math.random() * 900000000)}`; // Simple 10-digit Indian mobile format

      if (usedEmails.has(email) || usedMobiles.has(mobile)) {
        continue;
      }

      const profession = professions[Math.floor(Math.random() * professions.length)];
      const department = departments[Math.floor(Math.random() * departments.length)];
      const designation = profession; // Using profession as designation as well for consistency

      try {
        // Insert into users
        const [userResult] = await db.execute(
          "INSERT INTO users (name, email, mobile, password, role) VALUES (?, ?, ?, ?, 'teacher')",
          [name, email, mobile, hashedPassword]
        );

        const userId = userResult.insertId;

        // Insert into staff
        await db.execute(
          "INSERT INTO staff (user_id, department_id, designation, profession) VALUES (?, ?, ?, ?)",
          [userId, department.id, designation, profession]
        );

        usedEmails.add(email);
        usedMobiles.add(mobile);
        count++;
        console.log(`[${count}/20] Added Teacher: ${name} (${email}) - ${department.name}`);
      } catch (err) {
        console.error(`Error adding teacher ${name}:`, err.message);
      }
    }

    console.log("Teacher Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seedTeachers();

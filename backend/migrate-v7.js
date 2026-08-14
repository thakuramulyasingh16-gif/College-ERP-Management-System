require('dotenv').config({ path: './backend/.env' });
const db = require("./config/db");

const migrateV7 = async () => {
  try {
    console.log("Starting Migration V7: Create Teachers View...");

    await db.execute(`
      CREATE OR REPLACE VIEW teachers AS 
      SELECT 
        u.id, 
        u.id as user_id, 
        s.id as staff_id, 
        u.name, 
        u.email, 
        u.mobile, 
        s.designation, 
        s.profession, 
        d.name as department, 
        d.id as department_id, 
        u.profile_image 
      FROM users u 
      JOIN staff s ON u.id = s.user_id 
      LEFT JOIN departments d ON s.department_id = d.id 
      WHERE u.role = 'teacher'
    `);
    
    console.log("View 'teachers' created successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Migration V7 failed:", error);
    process.exit(1);
  }
};

migrateV7();

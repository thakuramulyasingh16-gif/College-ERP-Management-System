require('dotenv').config({ path: './backend/.env' });
const db = require("./config/db");

const migrateV6 = async () => {
  try {
    console.log("Starting Migration V6...");

    try {
        await db.execute(`ALTER TABLE users ADD COLUMN profile_image VARCHAR(255) DEFAULT NULL`);
        console.log("profile_image added to users.");
    } catch (e) { 
        console.log("profile_image in users might already exist or error occurred.");
        console.log(e.message);
    }

    console.log("Migration V6 completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration V6 failed:", error);
    process.exit(1);
  }
};

migrateV6();

require('dotenv').config({ path: './backend/.env' });
const db = require("./config/db");

const migrateV11 = async () => {
  try {
    console.log("Starting Migration V11: Adding profession to staff table...");

    try {
        await db.execute(`ALTER TABLE staff ADD COLUMN profession VARCHAR(255) DEFAULT NULL`);
        console.log("profession added to staff.");
    } catch (e) { console.log("profession in staff might already exist."); }

    console.log("Migration V11 completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration V11 failed:", error);
    process.exit(1);
  }
};

migrateV11();

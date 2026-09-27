require('dotenv').config({ path: './backend/.env' });
const db = require("./config/db");

const migrateV13 = async () => {
  try {
    console.log("Starting Migration V13: Adding current_session_token to users table for single active session per user...");
    try {
      await db.execute("ALTER TABLE users ADD COLUMN current_session_token TEXT DEFAULT NULL");
      console.log("SUCCESS: current_session_token added to users table.");
    } catch (e) {
      console.log("INFO: current_session_token column already exists or handled:", e.message);
    }
    console.log("Migration V13 completed.");
  } catch (err) {
    console.error("Migration V13 failed:", err);
  } finally {
    process.exit(0);
  }
};

migrateV13();

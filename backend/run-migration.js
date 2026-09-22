const { execSync } = require('child_process');
const fs = require('fs');

const migrationFiles = [
  'migrate-v2.js',
  'migrate-v3.js',
  'migrate-v4.js',
  'migrate-v5.js',
  'migrate-v6.js',
  'migrate-v7.js',
  'migrate-v8.js',
  'migrate-v9.js',
  'migrate-v10.js',
  'migrate-v11.js',
  'migrate-v12.js'
];

console.log('--- Starting All Database Migrations ---');

for (const file of migrationFiles) {
  if (fs.existsSync(file)) {
    try {
      console.log(`\n>> Executing: ${file}`);
      execSync(`node ${file}`, { stdio: 'inherit' });
      console.log(`>> Finished: ${file}`);
    } catch (err) {
      console.error(`\n[ERROR] Migration failed at ${file}:`, err.message);
      process.exit(1);
    }
  } else {
    console.warn(`[SKIP] File not found: ${file}`);
  }
}

console.log('\n--- All Migrations Completed Successfully! ---');

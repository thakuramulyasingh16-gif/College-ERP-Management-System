const assert = require('assert');
const http = require('http');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

process.env.JWT_SECRET = 'test-audit-key-password-flows';
process.env.NODE_ENV = 'production';

// In-memory mock database state
const mockUsers = {
  1: { id: 1, email: 'admin@college.com', role: 'admin', name: 'Super Admin', password: '' },
  2: { id: 2, email: 'teacher@college.com', role: 'teacher', name: 'Dr. Sharma', password: '' },
  3: { id: 3, email: 'student@college.com', role: 'student', name: 'Rahul Verma', password: '' }
};

const mockStaff = {
  2: { id: 5, user_id: 2 } // Staff ID is 5
};

const mockStudents = {
  3: { id: 10, user_id: 3, roll_no: '2023-BCA-001' } // Roll No is 2023-BCA-001
};

let currentTestToken = '';

// Setup initial bcrypt passwords
(async () => {
  mockUsers[1].password = await bcrypt.hash('Admin@Initial123', 10);
  mockUsers[2].password = await bcrypt.hash('Teacher@Initial123', 10);
  mockUsers[3].password = await bcrypt.hash('Student@Initial123', 10);
})();

// Mock db.execute before loading erpRoutes
const db = require('./config/db');
db.execute = async (query, params = []) => {
  // Users lookup for session, role, password
  if (query.includes('FROM users WHERE id = ?')) {
    const uid = params[0];
    const u = mockUsers[uid];
    return [u ? [{ ...u, current_session_token: currentTestToken }] : []];
  }

  // Staff lookup: SELECT id FROM staff WHERE user_id = ?
  if (query.includes('FROM staff WHERE user_id = ?')) {
    const uid = params[0];
    const s = mockStaff[uid];
    return [s ? [s] : []];
  }

  // Students lookup: SELECT roll_no FROM students WHERE user_id = ?
  if (query.includes('FROM students WHERE user_id = ?')) {
    const uid = params[0];
    const st = mockStudents[uid];
    return [st ? [st] : []];
  }

  // Update users password: UPDATE users SET password = ? WHERE id = ?
  if (query.includes('UPDATE users SET password = ? WHERE id = ?')) {
    const [hashed, uid] = params;
    if (mockUsers[uid]) {
      mockUsers[uid].password = hashed;
    }
    return [{ affectedRows: 1 }];
  }

  return [[]];
};

const erpRoutes = require('./routes/erpRoutes');

async function runPasswordFlowTests() {
  console.log('====================================================');
  console.log('🔐 TESTING COLLEGE ERP PASSWORD FLOWS (FLOW 1 & 2)');
  console.log('====================================================\n');

  // Wait for initial passwords to be hashed
  await new Promise(r => setTimeout(r, 200));

  const app = express();
  app.use(express.json());
  app.use('/api', erpRoutes);

  const server = http.createServer(app);
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;

  function req(path, method = 'POST', headers = {}, body = null) {
    if (headers.Authorization && headers.Authorization.startsWith('Bearer ')) {
      currentTestToken = headers.Authorization.split(' ')[1];
    }
    return new Promise((resolve, reject) => {
      const r = http.request(`http://127.0.0.1:${port}${path}`, { method, headers }, res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, body: data });
          }
        });
      });
      r.on('error', reject);
      if (body) r.write(JSON.stringify(body));
      r.end();
    });
  }

  try {
    const adminToken = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET);
    const teacherToken = jwt.sign({ id: 2, role: 'teacher' }, process.env.JWT_SECRET);
    const studentToken = jwt.sign({ id: 3, role: 'student' }, process.env.JWT_SECRET);

    console.log('--- FLOW 1: ADMIN CHANGING OWN PASSWORD (POST /api/change-password) ---');

    // 1. Wrong old password
    const wrongOldRes = await req('/api/change-password', 'POST', {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    }, {
      oldPassword: 'WrongOldPassword!123',
      newPassword: 'BrandNewPassword@2026'
    });
    assert.strictEqual(wrongOldRes.status, 400, 'Expected 400 for wrong current password');
    assert.strictEqual(wrongOldRes.body.message, 'Current password is incorrect');
    console.log('  ✅ PASS: Wrong old password rejected with "Current password is incorrect"');

    // 2. Short new password (< 8 chars)
    const shortNewRes = await req('/api/change-password', 'POST', {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    }, {
      oldPassword: 'Admin@Initial123',
      newPassword: 'short'
    });
    assert.strictEqual(shortNewRes.status, 400, 'Expected 400 for password < 8 chars');
    console.log('  ✅ PASS: New password < 8 characters rejected');

    // 3. Correct old password -> Success
    const correctRes = await req('/api/change-password', 'POST', {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    }, {
      oldPassword: 'Admin@Initial123',
      newPassword: 'NewSecureAdminPassword@2026'
    });
    assert.strictEqual(correctRes.status, 200, 'Expected 200 for successful password change');
    assert.strictEqual(correctRes.body.success, true);
    assert.strictEqual(correctRes.body.message, 'Password changed successfully');

    // Verify hash changed and matches new password
    const matchesNew = await bcrypt.compare('NewSecureAdminPassword@2026', mockUsers[1].password);
    assert.strictEqual(matchesNew, true, 'User password in DB should match new password');
    console.log('  ✅ PASS: Admin changed own password successfully with verification in DB');

    console.log('\n--- FLOW 2: ADMIN RESETTING TEACHER/STUDENT PASSWORD (POST /api/reset-password) ---');

    // 4. Non-admin forbidden
    const nonAdminRes = await req('/api/reset-password', 'POST', {
      Authorization: `Bearer ${studentToken}`,
      'Content-Type': 'application/json'
    }, {
      userId: 2,
      newPassword: 'HackedPassword123',
      confirmedIdentifier: '5'
    });
    assert.strictEqual(nonAdminRes.status, 403, 'Expected 403 when student calls reset-password');
    console.log('  ✅ PASS: Non-admin calling reset-password blocked with HTTP 403');

    // 5. Reset Teacher with WRONG Teacher ID
    const wrongTeacherIdRes = await req('/api/reset-password', 'POST', {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    }, {
      userId: 2,
      newPassword: 'ResetTeacherPass@123',
      confirmedIdentifier: '999' // Actual staff.id is 5
    });
    assert.strictEqual(wrongTeacherIdRes.status, 400, 'Expected 400 for wrong teacher ID');
    assert.strictEqual(wrongTeacherIdRes.body.message, 'Identity confirmation failed: Teacher ID does not match');
    console.log('  ✅ PASS: Reset teacher with wrong Teacher ID blocked (400)');

    // 6. Reset Teacher with CORRECT Teacher ID
    const correctTeacherRes = await req('/api/reset-password', 'POST', {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    }, {
      userId: 2,
      newPassword: 'ResetTeacherPass@123',
      confirmedIdentifier: '5' // Actual staff.id is 5
    });
    assert.strictEqual(correctTeacherRes.status, 200, 'Expected 200 for correct teacher reset');
    assert.strictEqual(correctTeacherRes.body.success, true);
    const teacherMatches = await bcrypt.compare('ResetTeacherPass@123', mockUsers[2].password);
    assert.strictEqual(teacherMatches, true, 'Teacher password in DB should match reset password');
    console.log('  ✅ PASS: Reset teacher with correct Teacher ID succeeded & updated in DB');

    // 7. Reset Student with WRONG Roll Number
    const wrongStudentRollRes = await req('/api/reset-password', 'POST', {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    }, {
      userId: 3,
      newPassword: 'ResetStudentPass@123',
      confirmedIdentifier: 'WRONG-ROLL-NO' // Actual roll_no is 2023-BCA-001
    });
    assert.strictEqual(wrongStudentRollRes.status, 400, 'Expected 400 for wrong student roll number');
    assert.strictEqual(wrongStudentRollRes.body.message, 'Identity confirmation failed: Roll number does not match');
    console.log('  ✅ PASS: Reset student with wrong roll number blocked (400)');

    // 8. Reset Student with CORRECT Roll Number
    const correctStudentRes = await req('/api/reset-password', 'POST', {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    }, {
      userId: 3,
      newPassword: 'ResetStudentPass@123',
      confirmedIdentifier: '2023-BCA-001'
    });
    assert.strictEqual(correctStudentRes.status, 200, 'Expected 200 for correct student reset');
    assert.strictEqual(correctStudentRes.body.success, true);
    const studentMatches = await bcrypt.compare('ResetStudentPass@123', mockUsers[3].password);
    assert.strictEqual(studentMatches, true, 'Student password in DB should match reset password');
    console.log('  ✅ PASS: Reset student with correct roll number succeeded & updated in DB');

    console.log('\n--- FLOW 1 GENERIC FOR OTHER ROLES (TEACHER/STUDENT SELF-SERVICE) ---');

    // 9. Teacher changing own password
    const teacherSelfRes = await req('/api/change-password', 'POST', {
      Authorization: `Bearer ${teacherToken}`,
      'Content-Type': 'application/json'
    }, {
      oldPassword: 'ResetTeacherPass@123',
      newPassword: 'TeacherSelfUpdatedPassword@2026'
    });
    assert.strictEqual(teacherSelfRes.status, 200, 'Expected 200 for teacher changing own password');
    console.log('  ✅ PASS: Teacher can change own password using generic change-password endpoint');

    console.log('\n====================================================');
    console.log('🎉 ALL 9 PASSWORD FLOW TESTS PASSED PERFECTLY!');
    console.log('====================================================\n');
  } finally {
    server.close();
  }
}

runPasswordFlowTests().catch(err => {
  console.error('Password flow tests failed:', err);
  process.exit(1);
});

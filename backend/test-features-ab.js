const assert = require('assert');
const http = require('http');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

process.env.JWT_SECRET = 'test-secret-features-ab';
process.env.NODE_ENV = 'production';

// Mock DB State
let nextUserId = 100;
let nextStaffId = 10;
let nextStudentId = 20;

const mockUsers = {
  1: { id: 1, email: 'admin@college.com', role: 'admin', name: 'Super Admin', password: '' },
  2: { id: 2, email: 'teacher@college.com', role: 'teacher', name: 'Prof. Alan Turing', password: '' },
  3: { id: 3, email: 'student1@college.com', role: 'student', name: 'Grace Hopper', password: '' },
  4: { id: 4, email: 'student2@college.com', role: 'student', name: 'Ada Lovelace', password: '' }
};

const mockStaff = {
  2: { id: 1, user_id: 2, teacher_code: 'TCH-001', department_id: 1, designation: 'Professor', profession: 'Academic' }
};

const mockStudents = {
  3: { id: 1, user_id: 3, course_id: 1, admission_year: 2024, session: '2024-2027', roll_no: null, roll_no_locked: 0 },
  4: { id: 2, user_id: 4, course_id: 1, admission_year: 2024, session: '2024-2027', roll_no: null, roll_no_locked: 0 }
};

let currentTestToken = '';

// Setup initial bcrypt passwords
(async () => {
  for (const uid of Object.keys(mockUsers)) {
    mockUsers[uid].password = await bcrypt.hash('InitPass123!', 10);
  }
})();

// Mock db.execute before erpRoutes
const db = require('./config/db');
db.execute = async (query, params = []) => {
  // Users lookup for session & auth
  if (query.includes('FROM users WHERE id = ?')) {
    const uid = params[0];
    const u = mockUsers[uid];
    return [u ? [{ ...u, current_session_token: currentTestToken }] : []];
  }

  // Course lookup
  if (query.includes('FROM courses WHERE id = ?')) {
    return [[{ id: 1, name: 'BCA' }]];
  }

  // Teacher creation: Check if user exists
  if (query.includes('FROM users WHERE email = ?')) {
    const email = params[0];
    const match = Object.values(mockUsers).filter(u => u.email === email);
    return [match];
  }

  // Teacher duplicate check: SELECT id FROM staff WHERE teacher_code = ?
  if (query.includes('SELECT id FROM staff WHERE teacher_code = ?')) {
    const code = params[0];
    const excludeUserId = params[1] || null;
    const match = Object.values(mockStaff).filter(s => 
      s.teacher_code && s.teacher_code.toLowerCase() === String(code).toLowerCase() && (excludeUserId === null || s.user_id !== excludeUserId)
    );
    return [match];
  }

  // Insert User
  if (query.includes('INSERT INTO users')) {
    const [name, email, mobile, password, profile_image] = params;
    const role = query.includes("'teacher'") ? 'teacher' : (query.includes("'student'") ? 'student' : 'student');
    const uid = nextUserId++;
    mockUsers[uid] = { id: uid, name, email, password, mobile, role, profile_image };
    return [{ insertId: uid }];
  }

  // Insert Staff
  if (query.includes('INSERT INTO staff')) {
    // INSERT INTO staff (user_id, teacher_code, department_id, designation, profession, profile_image)
    const [user_id, teacher_code, department_id, designation, profession, profile_image] = params;
    // Check unique constraint simulation
    const exists = Object.values(mockStaff).some(s => s.teacher_code === teacher_code);
    if (exists) {
      const err = new Error(`Duplicate entry '${teacher_code}' for key 'staff.teacher_code'`);
      err.code = 'ER_DUP_ENTRY';
      throw err;
    }
    const staffId = nextStaffId++;
    mockStaff[user_id] = { id: staffId, user_id, teacher_code, department_id, designation, profession };
    return [{ insertId: staffId }];
  }

  // Update Staff
  if (query.includes('UPDATE staff SET')) {
    // UPDATE staff SET department_id = ?, designation = ?, profession = ?, teacher_code = ? WHERE user_id = ?
    const [department_id, designation, profession, teacher_code, user_id] = params;
    const exists = Object.values(mockStaff).some(s => s.teacher_code === teacher_code && s.user_id !== user_id);
    if (exists) {
      const err = new Error(`Duplicate entry '${teacher_code}' for key 'staff.teacher_code'`);
      err.code = 'ER_DUP_ENTRY';
      throw err;
    }
    if (mockStaff[user_id]) {
      mockStaff[user_id].department_id = department_id;
      mockStaff[user_id].designation = designation;
      mockStaff[user_id].profession = profession;
      if (teacher_code) mockStaff[user_id].teacher_code = teacher_code;
    }
    return [{ affectedRows: 1 }];
  }

  // Get Staff: SELECT ... s.teacher_code ...
  if (query.includes('s.teacher_code')) {
    const rows = Object.values(mockStaff).map(s => {
      const u = mockUsers[s.user_id] || {};
      return {
        user_id: s.user_id,
        staff_id: s.id,
        teacher_code: s.teacher_code,
        name: u.name,
        email: u.email,
        mobile: u.mobile,
        department: 'Computer Science',
        designation: s.designation,
        profession: s.profession
      };
    });
    return [rows];
  }

  // Insert Student: INSERT INTO students (user_id, course_id, admission_year, session, roll_no, roll_no_locked)
  if (query.includes('INSERT INTO students')) {
    const [user_id, course_id, admission_year, session, roll_no] = params;
    if (roll_no) {
      const dup = Object.values(mockStudents).some(st => st.roll_no === roll_no);
      if (dup) {
        const err = new Error(`Duplicate entry '${roll_no}' for key 'students.roll_no'`);
        err.code = 'ER_DUP_ENTRY';
        throw err;
      }
    }
    const studentId = nextStudentId++;
    mockStudents[user_id] = { id: studentId, user_id, course_id, admission_year, session, roll_no: roll_no || null, roll_no_locked: 0 };
    return [{ insertId: studentId }];
  }

  // Student roll number self-service lookup: SELECT id, roll_no, roll_no_locked FROM students WHERE user_id = ?
  if (query.includes('SELECT id, roll_no, roll_no_locked FROM students WHERE user_id = ?')) {
    const uid = params[0];
    const st = mockStudents[uid];
    return [st ? [st] : []];
  }

  // Student set own roll number: UPDATE students SET roll_no = ?, roll_no_locked = TRUE WHERE user_id = ?
  if (query.includes('UPDATE students SET roll_no = ?, roll_no_locked = TRUE WHERE user_id = ?')) {
    const [roll_no, uid] = params;
    const dup = Object.values(mockStudents).some(st => st.roll_no === roll_no && st.user_id !== uid);
    if (dup) {
      const err = new Error(`Duplicate entry '${roll_no}' for key 'students.roll_no'`);
      err.code = 'ER_DUP_ENTRY';
      throw err;
    }
    if (mockStudents[uid]) {
      mockStudents[uid].roll_no = roll_no;
      mockStudents[uid].roll_no_locked = 1;
    }
    return [{ affectedRows: 1 }];
  }

  // Admin unlock roll number: UPDATE students SET roll_no_locked = FALSE WHERE user_id = ? OR id = ?
  if (query.includes('UPDATE students SET roll_no_locked = FALSE WHERE user_id = ? OR id = ?')) {
    const [targetId] = params;
    const student = mockStudents[targetId] || Object.values(mockStudents).find(st => st.id === Number(targetId));
    if (student) {
      student.roll_no_locked = 0;
      return [{ affectedRows: 1 }];
    }
    return [{ affectedRows: 0 }];
  }

  // Get Students
  if (query.includes('st.roll_no_locked')) {
    const rows = Object.values(mockStudents).map(st => {
      const u = mockUsers[st.user_id] || {};
      return {
        user_id: st.user_id,
        student_id: st.id,
        name: u.name,
        email: u.email,
        mobile: u.mobile,
        roll_number: st.roll_no,
        roll_no_locked: st.roll_no_locked,
        admission_year: st.admission_year,
        course: 'BCA'
      };
    });
    return [rows];
  }

  // SELECT teacher_code FROM staff WHERE user_id = ?
  if (query.includes('FROM staff WHERE user_id = ?')) {
    const uid = params[0];
    const s = mockStaff[uid];
    return [s ? [{ id: s.id, teacher_code: s.teacher_code }] : []];
  }

  // SELECT roll_no FROM students WHERE user_id = ?
  if (query.includes('SELECT roll_no FROM students WHERE user_id = ?')) {
    const uid = params[0];
    const st = mockStudents[uid];
    return [st ? [{ roll_no: st.roll_no }] : []];
  }

  // UPDATE users SET password = ? WHERE id = ?
  if (query.includes('UPDATE users SET password = ? WHERE id = ?')) {
    const [hashed, uid] = params;
    if (mockUsers[uid]) mockUsers[uid].password = hashed;
    return [{ affectedRows: 1 }];
  }

  return [[]];
};

const erpRoutes = require('./routes/erpRoutes');

async function runFeatureTests() {
  console.log('================================================================');
  console.log('🧪 VERIFYING PART A & PART B REQUIREMENTS (6 SCENARIOS)');
  console.log('================================================================\n');

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

  const adminToken = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET);
  const teacherToken = jwt.sign({ id: 2, role: 'teacher' }, process.env.JWT_SECRET);
  const student1Token = jwt.sign({ id: 3, role: 'student' }, process.env.JWT_SECRET);
  const student2Token = jwt.sign({ id: 4, role: 'student' }, process.env.JWT_SECRET);

  // ============================================================================
  // TEST 1: Admin creates a teacher with Teacher ID, confirms display & password reset check
  // ============================================================================
  console.log('--- TEST 1: TEACHER ID ASSIGNMENT & PASSWORD RESET VERIFICATION ---');
  
  // 1a. Missing teacher_code returns 400
  const missingCodeRes = await req('/api/teachers', 'POST', {
    Authorization: `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  }, {
    name: 'Prof. Knuth',
    email: 'knuth@college.com',
    password: 'Password123!',
    mobile: '9876543210',
    department_id: 1,
    designation: 'Professor'
  });
  assert.strictEqual(missingCodeRes.status, 400, 'Missing teacher_code should return 400');
  assert.strictEqual(missingCodeRes.body.message, 'Teacher ID is required');
  console.log('  ✅ 1a: Teacher creation without teacher_code correctly rejected');

  // 1b. Create teacher with valid teacher_code
  const createTeacherRes = await req('/api/teachers', 'POST', {
    Authorization: `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  }, {
    teacher_code: 'TCH-002',
    name: 'Prof. Donald Knuth',
    email: 'knuth@college.com',
    password: 'Password123!',
    mobile: '9876543210',
    department_id: 1,
    designation: 'Professor'
  });
  assert.strictEqual(createTeacherRes.status, 201, 'Teacher creation should succeed with 201');
  assert.strictEqual(createTeacherRes.body.success, true);
  console.log('  ✅ 1b: Teacher created successfully with teacher_code: TCH-002');

  // 1c. Duplicate teacher_code returns friendly error
  const dupTeacherRes = await req('/api/teachers', 'POST', {
    Authorization: `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  }, {
    teacher_code: 'TCH-002',
    name: 'Prof. Other',
    email: 'other@college.com',
    password: 'Password123!',
    mobile: '9876543211',
    department_id: 1,
    designation: 'Lecturer'
  });
  assert.strictEqual(dupTeacherRes.status, 400, 'Duplicate teacher_code should return 400');
  assert.strictEqual(dupTeacherRes.body.message, 'Teacher ID already exists, please use a different one');
  console.log('  ✅ 1c: Duplicate Teacher ID returns expected friendly error');

  // 1d. GET /api/teachers includes teacher_code
  const staffListRes = await req('/api/teachers', 'GET', {
    Authorization: `Bearer ${adminToken}`
  });
  assert.strictEqual(staffListRes.status, 200);
  const found = staffListRes.body.data.find(s => s.teacher_code === 'TCH-002');
  assert.ok(found, 'Created teacher must have teacher_code in staff list');
  console.log('  ✅ 1d: GET /api/teachers returns teacher_code in list');

  // 1e. Password reset for teacher using old internal staff.id fails
  const wrongResetRes = await req('/api/reset-password', 'POST', {
    Authorization: `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  }, {
    userId: 2,
    newPassword: 'BrandNewPassword@2026',
    confirmedIdentifier: '1' // Old internal staff id
  });
  assert.strictEqual(wrongResetRes.status, 400);
  assert.strictEqual(wrongResetRes.body.message, 'Identity confirmation failed: Teacher ID does not match');
  console.log('  ✅ 1e: Reset password rejected when internal staff.id is supplied instead of teacher_code');

  // 1f. Password reset for teacher using teacher_code succeeds
  const correctResetRes = await req('/api/reset-password', 'POST', {
    Authorization: `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  }, {
    userId: 2,
    newPassword: 'BrandNewPassword@2026',
    confirmedIdentifier: 'TCH-001' // Registered teacher_code
  });
  assert.strictEqual(correctResetRes.status, 200);
  assert.strictEqual(correctResetRes.body.success, true);
  console.log('  ✅ 1f: Reset password succeeds when valid teacher_code is supplied');


  // ============================================================================
  // TEST 2: Admin creates student WITHOUT roll number & password reset blocked
  // ============================================================================
  console.log('\n--- TEST 2: STUDENT CREATION WITHOUT ROLL NUMBER & RESET SAFEGUARD ---');

  const createStudentRes = await req('/api/students', 'POST', {
    Authorization: `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  }, {
    name: 'Linus Torvalds',
    email: 'linus@college.com',
    password: 'Password123!',
    mobile: '9876543299',
    course_id: 1,
    admission_year: 2024
    // roll_no is omitted
  });
  assert.strictEqual(createStudentRes.status, 201, 'Student creation without roll_no should succeed with 201');
  const createdUser = Object.values(mockUsers).find(u => u.email === 'linus@college.com');
  const createdUserId = createdUser.id;
  assert.strictEqual(mockStudents[createdUserId].roll_no, null, 'roll_no must be null');
  assert.strictEqual(mockStudents[createdUserId].roll_no_locked, 0, 'roll_no_locked must be 0/false');
  console.log('  ✅ 2a: Student created without roll number, roll_no=NULL, roll_no_locked=FALSE');

  // Attempt password reset before roll number is set
  const preRollResetRes = await req('/api/reset-password', 'POST', {
    Authorization: `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  }, {
    userId: createdUserId,
    newPassword: 'BrandNewPassword@2026',
    confirmedIdentifier: 'anything'
  });
  assert.strictEqual(preRollResetRes.status, 400);
  assert.strictEqual(
    preRollResetRes.body.message,
    'This student has not set their roll number yet — identity cannot be confirmed for password reset.'
  );
  console.log('  ✅ 2b: Password reset blocked with specific message when roll_no is NULL');


  // ============================================================================
  // TEST 3: Student adds their roll number once -> Locked in DB & visible in admin
  // ============================================================================
  console.log('\n--- TEST 3: STUDENT ONE-TIME SELF-SERVICE ROLL NUMBER ---');

  const setRollRes = await req('/api/student/roll-number', 'POST', {
    Authorization: `Bearer ${student1Token}`,
    'Content-Type': 'application/json'
  }, {
    roll_no: '2024-BCA-001'
  });
  assert.strictEqual(setRollRes.status, 200);
  assert.strictEqual(setRollRes.body.success, true);
  assert.strictEqual(mockStudents[3].roll_no, '2024-BCA-001');
  assert.strictEqual(mockStudents[3].roll_no_locked, 1);
  console.log('  ✅ 3a: Student sets roll number, roll_no saved and roll_no_locked set to 1');

  // Admin student list reflects roll_no and locked status
  const studentsListRes = await req('/api/students', 'GET', {
    Authorization: `Bearer ${adminToken}`
  });
  assert.strictEqual(studentsListRes.status, 200);
  const studentRow = studentsListRes.body.data.find(s => s.user_id === 3);
  assert.strictEqual(studentRow.roll_number, '2024-BCA-001');
  assert.strictEqual(studentRow.roll_no_locked, 1);
  console.log('  ✅ 3b: Admin student list shows roll_number and roll_no_locked = true');


  // ============================================================================
  // TEST 4: Student cannot edit roll number while locked & duplicate check works
  // ============================================================================
  console.log('\n--- TEST 4: ATTEMPT EDIT WHILE LOCKED & DUPLICATE PREVENTION ---');

  // 4a. Student 1 attempts to change roll number again
  const editLockedRes = await req('/api/student/roll-number', 'POST', {
    Authorization: `Bearer ${student1Token}`,
    'Content-Type': 'application/json'
  }, {
    roll_no: '2024-BCA-999'
  });
  assert.strictEqual(editLockedRes.status, 403, 'Should reject with 403 when locked');
  assert.strictEqual(editLockedRes.body.message, 'Roll number already set. Contact admin to request a change.');
  console.log('  ✅ 4a: Student rejected with 403 when attempting to edit locked roll number');

  // 4b. Student 2 attempts to claim Student 1\'s roll number
  const dupStudentRes = await req('/api/student/roll-number', 'POST', {
    Authorization: `Bearer ${student2Token}`,
    'Content-Type': 'application/json'
  }, {
    roll_no: '2024-BCA-001'
  });
  assert.strictEqual(dupStudentRes.status, 400);
  assert.strictEqual(dupStudentRes.body.message, 'This roll number is already in use');
  console.log('  ✅ 4b: Duplicate roll number submission returns "This roll number is already in use"');


  // ============================================================================
  // TEST 5: Admin unlocks student roll number -> Student re-enters & re-locks
  // ============================================================================
  console.log('\n--- TEST 5: ADMIN UNLOCK ROLL NUMBER & RE-ENTRY ---');

  // Non-admin cannot unlock
  const unauthorizedUnlock = await req('/api/students/3/unlock-roll-number', 'POST', {
    Authorization: `Bearer ${student1Token}`
  });
  assert.strictEqual(unauthorizedUnlock.status, 403, 'Non-admin cannot unlock');
  console.log('  ✅ 5a: Non-admin unauthorized to unlock roll number');

  // Admin unlocks
  const unlockRes = await req('/api/students/3/unlock-roll-number', 'POST', {
    Authorization: `Bearer ${adminToken}`
  });
  assert.strictEqual(unlockRes.status, 200);
  assert.strictEqual(unlockRes.body.message, 'Roll number unlocked. Student can now re-enter it.');
  assert.strictEqual(mockStudents[3].roll_no_locked, 0);
  console.log('  ✅ 5b: Admin successfully unlocks roll number (roll_no_locked = 0)');

  // Student 1 can now re-enter a corrected roll number
  const correctedRollRes = await req('/api/student/roll-number', 'POST', {
    Authorization: `Bearer ${student1Token}`,
    'Content-Type': 'application/json'
  }, {
    roll_no: '2024-BCA-005'
  });
  assert.strictEqual(correctedRollRes.status, 200);
  assert.strictEqual(mockStudents[3].roll_no, '2024-BCA-005');
  assert.strictEqual(mockStudents[3].roll_no_locked, 1);
  console.log('  ✅ 5c: Student submits corrected roll number, now updated to 2024-BCA-005 and re-locked');


  // ============================================================================
  // TEST 6: Password reset identity check with OLD vs NEW roll number
  // ============================================================================
  console.log('\n--- TEST 6: PASSWORD RESET IDENTITY CHECK (OLD VS CURRENT ROLL NO) ---');

  // Attempt reset with the OLD roll number (2024-BCA-001)
  const oldRollResetRes = await req('/api/reset-password', 'POST', {
    Authorization: `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  }, {
    userId: 3,
    newPassword: 'BrandNewPassword@2026',
    confirmedIdentifier: '2024-BCA-001' // Old roll number
  });
  assert.strictEqual(oldRollResetRes.status, 400);
  assert.strictEqual(oldRollResetRes.body.message, 'Identity confirmation failed: Roll number does not match');
  console.log('  ✅ 6a: Reset password with OLD roll number fails identity confirmation');

  // Reset with current, correct roll number (2024-BCA-005)
  const currentRollResetRes = await req('/api/reset-password', 'POST', {
    Authorization: `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  }, {
    userId: 3,
    newPassword: 'BrandNewPassword@2026',
    confirmedIdentifier: '2024-BCA-005' // Current roll number
  });
  assert.strictEqual(currentRollResetRes.status, 200);
  assert.strictEqual(currentRollResetRes.body.success, true);
  console.log('  ✅ 6b: Reset password with CURRENT roll number succeeds');

  console.log('\n================================================================');
  console.log('🎉 ALL 6 TEST SUITES PASSED FLAWLESSLY!');
  console.log('================================================================\n');

  server.close();
  process.exit(0);
}

runFeatureTests().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});

const assert = require('assert');
const http = require('http');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-audit-key-12345';
process.env.NODE_ENV = 'production';

// Mock DB pool queries before loading controller
const db = require('./config/db');
db.execute = async (query, params = []) => {
  // If querying users table for current_session_token
  if (query.includes('FROM users WHERE id = ?')) {
    // Return token matching the auth header
    return [[{ current_session_token: currentTestToken }]];
  }
  // If querying students table
  if (query.includes('FROM students WHERE user_id = ?')) {
    const userId = params[0];
    return [[{ id: userId * 10, user_id: userId, course_id: 1, session: '2023-26', roll_no: 'CGC-01' }]];
  }
  // If querying fee structures
  if (query.includes('FROM fee_structures WHERE course_id = ?')) {
    return [[{ id: 101, category: 'Tuition', total_amount: 45000 }]];
  }
  // If querying fees
  if (query.includes('FROM fees WHERE student_id = ?')) {
    return [[{ amount_paid: 20000, status: 'partial', payment_method: 'Online', paid_date: '2026-01-15' }]];
  }
  // If inserting complaints
  if (query.includes('INSERT INTO complaints')) {
    return [{ insertId: 1 }];
  }
// Fallback
  return [[]];
};

const authRoutes = require('./routes/authRoutes');
const erpRoutes = require('./routes/erpRoutes');

let currentTestToken = '';

async function testIntegration() {
  console.log('Running real route integration test with erpRoutes & authRoutes...');

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api', erpRoutes);

  const server = http.createServer(app);
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;

  function req(path, method = 'GET', headers = {}, body = null) {
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
    const student1Token = jwt.sign({ id: 1, role: 'student' }, process.env.JWT_SECRET);
    const adminToken = jwt.sign({ id: 99, role: 'admin' }, process.env.JWT_SECRET);

    // 1. IDOR: Student 1 accessing Student 2's fees
    const idorRes = await req('/api/fees/student/2', 'GET', { Authorization: `Bearer ${student1Token}` });
    assert.strictEqual(idorRes.status, 403, 'Expected 403 for student accessing another student fees');
    console.log('✅ Real erpRoutes: Student IDOR blocked on /fees/student/:id (403)');

    // 2. Student 1 accessing own fees
    const ownRes = await req('/api/fees/student/1', 'GET', { Authorization: `Bearer ${student1Token}` });
    assert.strictEqual(ownRes.status, 200, 'Expected 200 for student accessing own fees');
    assert.strictEqual(ownRes.body.success, true);
    console.log('✅ Real erpRoutes: Student can view own fees (200)');

    // 3. Admin accessing Student 2's fees
    const adminRes = await req('/api/fees/student/2', 'GET', { Authorization: `Bearer ${adminToken}` });
    assert.strictEqual(adminRes.status, 200, 'Expected 200 for admin accessing student fees');
    console.log('✅ Real erpRoutes: Admin can view any student fees (200)');

    // 4. Input validation on payStudentFee (negative amount)
    const badPayRes = await req('/api/student/pay-fee', 'POST', {
      Authorization: `Bearer ${student1Token}`,
      'Content-Type': 'application/json'
    }, { fee_structure_id: 101, amount: -500 });
    assert.strictEqual(badPayRes.status, 400, 'Expected 400 for negative payment amount');
    console.log('✅ Real erpRoutes: Negative fee payment blocked (400)');

    // 5. Input validation on submitComplaint (empty title)
    const badComplaintRes = await req('/api/complaints', 'POST', {
      Authorization: `Bearer ${student1Token}`,
      'Content-Type': 'application/json'
    }, { title: '', message: '' });
    assert.strictEqual(badComplaintRes.status, 400, 'Expected 400 for empty complaint');
    console.log('✅ Real erpRoutes: Empty complaint submission blocked (400)');

    // 6. Input validation on register (invalid mobile & short password)
    const badRegisterRes = await req('/api/auth/register', 'POST', {
      'Content-Type': 'application/json'
    }, { name: 'A', email: 'not-an-email', mobile: '123', password: '12' });
    assert.strictEqual(badRegisterRes.status, 400, 'Expected 400 for invalid registration data');
    console.log('✅ Real authRoutes: Invalid registration format rejected (400)');

    console.log('\n🎉 ALL REAL ROUTE INTEGRATION TESTS PASSED PERFECTLY!\n');
  } finally {
    server.close();
  }
}

testIntegration().catch(err => {
  console.error('Integration test failed:', err);
  process.exit(1);
});

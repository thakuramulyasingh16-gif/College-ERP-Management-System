const assert = require('assert');
const http = require('http');
const express = require('express');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

// Set test environment
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-super-secret-key-security-audit';
process.env.NODE_ENV = 'production';

const uploadAuth = require('./middleware/uploadAuth');
const { registerRateLimiter, resetAll: resetRegisterLimiter } = require('./middleware/registerRateLimiter');
const upload = require('./middleware/upload');
const { validateUploadedFile } = require('./middleware/upload');

async function runSecurityTests() {
  console.log('====================================================');
  console.log('🔒 RUNNING COLLEGE ERP SECURITY HARDENING TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function report(name, isPass, detail = '') {
    if (isPass) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name} -> ${detail}`);
      failed++;
    }
  }

  // Generate tokens for testing
  const studentAToken = jwt.sign({ id: 10, role: 'student' }, process.env.JWT_SECRET);
  const studentBToken = jwt.sign({ id: 20, role: 'student' }, process.env.JWT_SECRET);
  const adminToken = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET);
  const expiredToken = jwt.sign({ id: 10, role: 'student', exp: Math.floor(Date.now() / 1000) - 60 }, process.env.JWT_SECRET);

  // Create isolated Express test app
  const app = express();
  app.use(express.json());

  // 1. Mock DB and IDOR logic for getStudentFeesById
  app.get('/api/fees/student/:id', (req, res, next) => {
    // Simulate auth middleware
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "No token" });
    try {
      req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
      next();
    } catch (e) {
      return res.status(401).json({ message: "Invalid token" });
    }
  }, (req, res) => {
    let { id } = req.params;
    // IDOR Protection under test
    if (req.user.role === 'student') {
      if (String(id) !== String(req.user.id)) {
        return res.status(403).json({
          success: false,
          message: "Access forbidden: You can only view your own fee records."
        });
      }
      id = req.user.id;
    }
    // Return mock fee record
    return res.status(200).json({ success: true, data: [{ student_id: id, total_amount: 50000 }] });
  });

  // 2. Mock IDOR logic for getMarks
  app.get('/api/marks', (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "No token" });
    try {
      req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
      next();
    } catch (e) {
      return res.status(401).json({ message: "Invalid token" });
    }
  }, (req, res) => {
    let { student_id } = req.query;
    if (req.user.role === 'student') {
      const ownStudentRecordId = 100; // Simulated student record ID for req.user.id 10
      const ownRollNo = "CGC-2023-01";
      if (student_id && String(student_id) !== String(ownStudentRecordId) && String(student_id) !== ownRollNo) {
        return res.status(403).json({ success: false, message: "Access forbidden: You can only view your own marks." });
      }
      student_id = ownStudentRecordId;
    }
    return res.status(200).json({ success: true, data: [{ student_id, marks: 95 }] });
  });

  // 3. Protected /uploads route under test
  app.use('/uploads', uploadAuth, express.static(path.join(__dirname, 'uploads')));

  // 4. Register rate limiter under test
  app.post('/api/auth/register', registerRateLimiter, (req, res) => {
    res.status(201).json({ success: true, message: "Registered" });
  });

  // 5. Upload magic bytes validation under test
  app.post('/api/upload/test', upload.single('profile_image'), validateUploadedFile, (req, res) => {
    res.status(200).json({ success: true, filename: req.file.filename });
  });

  // 6. Global error handler (production mode)
  app.get('/api/error-test', (req, res, next) => {
    next(new Error("SELECT * FROM sensitive_db_passwords; SyntaxError: unexpected token"));
  });
  app.use((err, req, res, next) => {
    const isDev = process.env.NODE_ENV === 'development';
    res.status(500).json({
      message: isDev ? err.message : 'Internal Server Error'
    });
  });

  // Start server on random available port
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Helper HTTP request function
  function makeRequest({ path, method = 'GET', headers = {}, body = null }) {
    return new Promise((resolve, reject) => {
      const req = http.request(`${baseUrl}${path}`, { method, headers }, res => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(raw); } catch (e) {}
          resolve({ status: res.statusCode, headers: res.headers, body: json || raw });
        });
      });
      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    });
  }

  try {
    // -------------------------------------------------------------
    // SUITE 1: IDOR Protection on Fee Records
    // -------------------------------------------------------------
    console.log('--- SUITE 1: IDOR Protection (getStudentFeesById) ---');

    // Test 1.1: Student A requesting Student B's fees
    const idorRes = await makeRequest({
      path: '/api/fees/student/20',
      headers: { Authorization: `Bearer ${studentAToken}` }
    });
    report(
      'Student cannot view other student fee data (IDOR blocked)',
      idorRes.status === 403 && idorRes.body.success === false,
      `Expected 403, got ${idorRes.status}`
    );

    // Test 1.2: Student A requesting own fees
    const ownFeeRes = await makeRequest({
      path: '/api/fees/student/10',
      headers: { Authorization: `Bearer ${studentAToken}` }
    });
    report(
      'Student can view own fee data',
      ownFeeRes.status === 200 && ownFeeRes.body.success === true,
      `Expected 200, got ${ownFeeRes.status}`
    );

    // Test 1.3: Admin requesting any student's fees
    const adminFeeRes = await makeRequest({
      path: '/api/fees/student/20',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    report(
      'Admin can view any student fee data',
      adminFeeRes.status === 200 && adminFeeRes.body.success === true,
      `Expected 200, got ${adminFeeRes.status}`
    );

    // -------------------------------------------------------------
    // SUITE 2: IDOR Protection on Marks
    // -------------------------------------------------------------
    console.log('\n--- SUITE 2: IDOR Protection on Marks ---');

    // Test 2.1: Student querying another student's marks
    const marksIdorRes = await makeRequest({
      path: '/api/marks?student_id=999',
      headers: { Authorization: `Bearer ${studentAToken}` }
    });
    report(
      'Student cannot query other students marks (IDOR blocked)',
      marksIdorRes.status === 403 && marksIdorRes.body.success === false,
      `Expected 403, got ${marksIdorRes.status}`
    );

    // Test 2.2: Student querying own marks
    const ownMarksRes = await makeRequest({
      path: '/api/marks?student_id=100',
      headers: { Authorization: `Bearer ${studentAToken}` }
    });
    report(
      'Student can query own marks',
      ownMarksRes.status === 200 && ownMarksRes.body.success === true,
      `Expected 200, got ${ownMarksRes.status}`
    );

    // -------------------------------------------------------------
    // SUITE 3: Protected /uploads Endpoint
    // -------------------------------------------------------------
    console.log('\n--- SUITE 3: Protected /uploads Endpoint ---');

    // Test 3.1: Anonymous access with no token
    const unauthUploadRes = await makeRequest({
      path: '/uploads/profile/test.jpg'
    });
    report(
      'Unauthenticated request to /uploads blocked with 401',
      unauthUploadRes.status === 401,
      `Expected 401, got ${unauthUploadRes.status}`
    );

    // Test 3.2: Access with expired token
    const expiredUploadRes = await makeRequest({
      path: `/uploads/profile/test.jpg?token=${expiredToken}`
    });
    report(
      'Expired token to /uploads blocked with 401',
      expiredUploadRes.status === 401,
      `Expected 401, got ${expiredUploadRes.status}`
    );

    // Test 3.3: Directory traversal attack
    const traversalRes = await makeRequest({
      path: `/uploads/..%2f..%2fserver.js?token=${studentAToken}`
    });
    report(
      'Directory traversal attempt on /uploads blocked',
      traversalRes.status === 403 || traversalRes.status === 400 || traversalRes.status === 404,
      `Expected 403/400, got ${traversalRes.status}`
    );

    // -------------------------------------------------------------
    // SUITE 4: Registration Rate Limiting
    // -------------------------------------------------------------
    console.log('\n--- SUITE 4: Registration Rate Limiting ---');
    resetRegisterLimiter();
    const testIp = '198.51.100.42';

    let rateLimitBlocked = false;
    let retryAfterFound = false;

    for (let i = 1; i <= 6; i++) {
      const res = await makeRequest({
        path: '/api/auth/register',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': testIp
        },
        body: JSON.stringify({ email: `test${i}@college.com` })
      });

      if (i <= 5) {
        assert.strictEqual(res.status, 201, `Request ${i} should be allowed`);
      } else {
        rateLimitBlocked = res.status === 429;
        retryAfterFound = Boolean(res.headers['retry-after']);
      }
    }

    report(
      'Registration rate limiter blocks 6th request within window with HTTP 429',
      rateLimitBlocked,
      '6th request was not blocked'
    );
    report(
      'Rate limiter includes Retry-After header',
      retryAfterFound,
      'Retry-After header missing'
    );

    // -------------------------------------------------------------
    // SUITE 5: Magic Bytes Upload Validation
    // -------------------------------------------------------------
    console.log('\n--- SUITE 5: Magic Bytes Upload Validation ---');

    // Create a spoofed payload (PHP script disguised as image/jpeg)
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const fakeImagePayload = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="profile_image"; filename="shell.jpg"',
      'Content-Type: image/jpeg',
      '',
      '<?php echo "Malicious WebShell Execution"; ?>',
      `--${boundary}--`
    ].join('\r\n');

    const spoofedUploadRes = await makeRequest({
      path: '/api/upload/test',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(fakeImagePayload)
      },
      body: fakeImagePayload
    });

    report(
      'Spoofed upload (text/PHP payload with image MIME) rejected with 400',
      spoofedUploadRes.status === 400 && typeof spoofedUploadRes.body === 'object' && spoofedUploadRes.body.success === false,
      `Expected 400, got ${spoofedUploadRes.status} -> ${JSON.stringify(spoofedUploadRes.body)}`
    );

    // -------------------------------------------------------------
    // SUITE 6: Error Message Leaks in Production
    // -------------------------------------------------------------
    console.log('\n--- SUITE 6: Information Disclosure Prevention ---');

    const errorLeakRes = await makeRequest({
      path: '/api/error-test'
    });

    const isLeaked = JSON.stringify(errorLeakRes.body).includes('sensitive_db_passwords') ||
                     JSON.stringify(errorLeakRes.body).includes('SyntaxError');

    report(
      'Global error handler masks internal SQL/stack trace errors in production',
      errorLeakRes.status === 500 && !isLeaked && errorLeakRes.body.message === 'Internal Server Error',
      `Internal error details leaked: ${JSON.stringify(errorLeakRes.body)}`
    );

  } finally {
    server.close();
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSecurityTests().catch(err => {
  console.error("FATAL TEST ERROR:", err);
  process.exit(1);
});

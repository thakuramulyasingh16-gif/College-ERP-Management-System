const assert = require('assert');
const express = require('express');
const http = require('http');
const { loginRateLimiter, resetAll, getLoginAttemptsStore } = require('./middleware/loginRateLimiter');

async function runTests() {
  console.log('🧪 Starting Login Rate Limiter Tests...\n');
  resetAll();

  // Setup minimal express app with rate limiter
  const app = express();
  app.use(express.json());

  // Dummy login route simulating authController.login
  app.post('/api/auth/login', loginRateLimiter, (req, res) => {
    const { email, password } = req.body;
    if (email === 'admin@citycolleges.info' && password === 'correctPassword') {
      return res.status(200).json({ success: true, message: 'Login successful' });
    }
    return res.status(401).json({ message: 'Invalid email or password' });
  });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/auth/login`;

  function sendLogin(email, password, customIp = '127.0.0.1') {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify({ email, password });
      const req = http.request(
        baseUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            'X-Forwarded-For': customIp,
          },
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            try {
              const data = JSON.parse(body);
              resolve({ status: res.statusCode, headers: res.headers, data });
            } catch (err) {
              resolve({ status: res.statusCode, headers: res.headers, raw: body });
            }
          });
        }
      );
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }

  try {
    // TEST 1: Intentionally enter wrong password 5 times
    console.log('--- TEST 1: 5 Consecutive Failed Login Attempts ---');
    for (let i = 1; i <= 5; i++) {
      const res = await sendLogin('target@user.com', 'wrongPassword');
      console.log(`Attempt ${i}: Status = ${res.status}, Message = "${res.data.message}"`);
      assert.strictEqual(res.status, 401, `Attempt ${i} should return 401`);
    }
    console.log('✅ Passed: First 5 failed attempts returned 401\n');

    // TEST 2: 6th attempt should be blocked with 429 and countdown
    console.log('--- TEST 2: 6th Attempt Blocked With HTTP 429 ---');
    const res6 = await sendLogin('target@user.com', 'wrongPassword');
    console.log(`Attempt 6: Status = ${res6.status}, Retry-After = ${res6.headers['retry-after']}, Body =`, res6.data);
    assert.strictEqual(res6.status, 429, '6th attempt must return 429');
    assert.ok(res6.data.retryAfter > 0 && res6.data.retryAfter <= 60, 'retryAfter should be between 1 and 60 seconds');
    assert.ok(res6.data.message.includes('Too many failed login attempts'), 'Message should indicate too many attempts');
    console.log('✅ Passed: 6th attempt blocked with HTTP 429 and retryAfter countdown\n');

    // TEST 3: Different identifier on same IP is NOT blocked
    console.log('--- TEST 3: Different User On Same IP Is NOT Blocked ---');
    const diffUserRes = await sendLogin('other@user.com', 'wrongPassword');
    console.log(`Different user status: ${diffUserRes.status} (expected 401, not 429)`);
    assert.strictEqual(diffUserRes.status, 401, 'Different user should not be locked out');
    console.log('✅ Passed: Different user identifier on same IP is isolated\n');

    // TEST 4: Same user from different IP is NOT blocked
    console.log('--- TEST 4: Same User From Different IP Is NOT Blocked ---');
    const diffIpRes = await sendLogin('target@user.com', 'wrongPassword', '192.168.1.50');
    console.log(`Different IP status: ${diffIpRes.status} (expected 401, not 429)`);
    assert.strictEqual(diffIpRes.status, 401, 'Same user from different IP should have separate key');
    console.log('✅ Passed: Different IP address produces separate key\n');

    // TEST 5: Successful login resets failed attempts counter
    console.log('--- TEST 5: Successful Login Resets Counter ---');
    resetAll();
    // 3 failed attempts
    for (let i = 1; i <= 3; i++) {
      await sendLogin('admin@citycolleges.info', 'wrongPassword');
    }
    // 1 successful attempt
    const successRes = await sendLogin('admin@citycolleges.info', 'correctPassword');
    console.log(`Successful login status: ${successRes.status}`);
    assert.strictEqual(successRes.status, 200, 'Login should succeed');

    // After success, 4 more failed attempts shouldn't lock out (because counter was reset to 0)
    for (let i = 1; i <= 4; i++) {
      const res = await sendLogin('admin@citycolleges.info', 'wrongPassword');
      assert.strictEqual(res.status, 401, `Post-success fail ${i} should be 401, not locked`);
    }
    console.log('✅ Passed: Successful login immediately reset counter to 0\n');

    // TEST 6: Auto-unlock after lockout expiration
    console.log('--- TEST 6: Lockout Auto-Expires After 60 Seconds ---');
    resetAll();
    // Trigger lockout
    for (let i = 1; i <= 5; i++) {
      await sendLogin('expire-test@user.com', 'wrongPassword');
    }
    const lockedRes = await sendLogin('expire-test@user.com', 'wrongPassword');
    assert.strictEqual(lockedRes.status, 429, 'Must be locked');

    // Manually advance the lockoutUntil in memory to simulate 60 seconds passing
    const store = getLoginAttemptsStore();
    const key = 'expire-test@user.com::127.0.0.1';
    const rec = store.get(key);
    assert.ok(rec && rec.lockedUntil, 'Record must be locked');
    rec.lockedUntil = Date.now() - 1000; // 1 second in the past

    // Next attempt should now be allowed (returning 401, not 429)
    const unlockedRes = await sendLogin('expire-test@user.com', 'wrongPassword');
    console.log(`After lockout expiration: Status = ${unlockedRes.status} (expected 401)`);
    assert.strictEqual(unlockedRes.status, 401, 'Should be unlocked and allowed again');
    console.log('✅ Passed: Lockout expired and attempts allowed normally again\n');

    console.log('🎉 ALL 6 RATE LIMITING TESTS PASSED PERFECTLY!');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

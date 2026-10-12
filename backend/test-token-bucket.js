const assert = require('assert');
const express = require('express');
const http = require('http');
const tokenBucketLimiter = require('./middleware/tokenBucketLimiter');
const { loginRateLimiter, resetAll: resetLoginLimiters } = require('./middleware/loginRateLimiter');

async function runTests() {
  console.log('🧪 Starting Global Token-Bucket Rate Limiter Tests...\n');

  // Reset stores before running
  tokenBucketLimiter.resetAll();
  if (resetLoginLimiters) resetLoginLimiters();

  // Create Express app mimicking server.js architecture
  const app = express();
  app.use(express.json());

  // Mount global token-bucket limiter on /api
  app.use('/api', tokenBucketLimiter);

  // General endpoint
  app.get('/api/resource', (req, res) => {
    res.status(200).json({ success: true, message: 'Resource accessed' });
  });

  // Sensitive login endpoint with its own loginRateLimiter
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
  const baseUrl = `http://127.0.0.1:${port}`;

  function request(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = `${baseUrl}${path}`;
      const method = options.method || 'GET';
      const payload = options.body ? JSON.stringify(options.body) : null;
      const headers = Object.assign({}, options.headers || {});

      if (payload) {
        headers['Content-Type'] = 'application/json';
        headers['Content-Length'] = Buffer.byteLength(payload);
      }

      const req = http.request(url, { method, headers }, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          let data;
          try {
            data = JSON.parse(body);
          } catch (_) {
            data = body;
          }
          resolve({ status: res.statusCode, headers: res.headers, data });
        });
      });

      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  try {
    const clientIp = '198.51.100.1';

    // TEST 1: First 100 requests from a fresh client succeed
    console.log('--- TEST 1: First 100 Requests From Fresh Client Succeed ---');
    for (let i = 1; i <= 100; i++) {
      const res = await request('/api/resource', {
        headers: { 'X-Forwarded-For': clientIp }
      });
      assert.strictEqual(res.status, 200, `Request ${i} should return 200 OK`);
      assert.strictEqual(res.data.success, true, `Request ${i} should have success: true`);
    }
    console.log('✅ Passed: All 100 requests succeeded within burst capacity\n');

    // TEST 2: 101st request within the same second gets HTTP 429
    console.log('--- TEST 2: 101st Request Gets HTTP 429 (Bucket Empty) ---');
    const res101 = await request('/api/resource', {
      headers: { 'X-Forwarded-For': clientIp }
    });
    console.log(`Request 101 status: ${res101.status}`);
    console.log(`Response body:`, res101.data);
    console.log(`Retry-After header:`, res101.headers['retry-after']);

    assert.strictEqual(res101.status, 429, '101st request must return HTTP 429');
    assert.strictEqual(res101.data.success, false, 'Response must have success: false');
    assert.ok(res101.data.retryAfter >= 1, 'retryAfter must be >= 1 second');
    assert.ok(res101.headers['retry-after'], 'Retry-After header must be set');
    assert.ok(res101.data.message.includes('Global API rate limit exceeded'), 'Message must indicate global rate limit');
    console.log('✅ Passed: 101st request blocked with HTTP 429 and Retry-After header\n');

    // TEST 3: After waiting for refill, requests succeed again
    console.log('--- TEST 3: Wait For Refill (2 tokens/sec) And Verify Success ---');
    console.log('Waiting 1100ms for bucket to refill tokens...');
    await new Promise((r) => setTimeout(r, 1100));

    const resRefill = await request('/api/resource', {
      headers: { 'X-Forwarded-For': clientIp }
    });
    console.log(`Post-refill request status: ${resRefill.status}`);
    assert.strictEqual(resRefill.status, 200, 'Post-refill request must return 200 OK');
    assert.strictEqual(resRefill.data.success, true, 'Post-refill request should succeed');
    console.log('✅ Passed: Requests succeed again after token bucket refills\n');

    // TEST 4: Sensitive endpoint (login) still enforces its OWN limiter independently
    console.log('--- TEST 4: Sensitive Endpoint (Login) Enforces Specific Limiter Independently ---');
    const sensitiveClientIp = '198.51.100.2';

    // Client has fresh token bucket (100 tokens). Send 5 failed logins:
    for (let i = 1; i <= 5; i++) {
      const loginRes = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'X-Forwarded-For': sensitiveClientIp },
        body: { email: 'victim@citycolleges.info', password: 'wrongPassword' }
      });
      assert.strictEqual(loginRes.status, 401, `Failed login attempt ${i} should return 401 Unauthorized`);
    }

    // 6th attempt to /api/auth/login: loginRateLimiter should lockout with 429
    const loginRes6 = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'X-Forwarded-For': sensitiveClientIp },
      body: { email: 'victim@citycolleges.info', password: 'wrongPassword' }
    });

    console.log(`6th login attempt status: ${loginRes6.status}`);
    console.log(`6th login response body:`, loginRes6.data);
    assert.strictEqual(loginRes6.status, 429, '6th login attempt must be blocked with 429 by loginRateLimiter');
    assert.ok(
      loginRes6.data.message.includes('Too many failed login attempts'),
      'Message must come specifically from loginRateLimiter'
    );

    // CRITICAL CHECK: Global token bucket still has ~94 tokens for this client!
    // A non-login request to /api/resource must succeed with 200:
    const generalRes = await request('/api/resource', {
      headers: { 'X-Forwarded-For': sensitiveClientIp }
    });
    console.log(`General endpoint status for same IP during login lockout: ${generalRes.status}`);
    assert.strictEqual(
      generalRes.status,
      200,
      'General /api/resource must still succeed (token bucket not exhausted)'
    );
    assert.strictEqual(generalRes.data.success, true);
    console.log('✅ Passed: Both layers (global token-bucket and sensitive login limiter) work independently\n');

    // TEST 5: Authenticated User Identifier Isolation
    console.log('--- TEST 5: Authenticated User Token Key Isolation ---');
    tokenBucketLimiter.resetAll();

    // User A and User B share the same IP (e.g. corporate NAT proxy)
    const sharedIp = '203.0.113.50';
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'test_secret';
    process.env.JWT_SECRET = secret;

    const tokenUserA = jwt.sign({ id: 101, email: 'userA@test.com' }, secret);
    const tokenUserB = jwt.sign({ id: 202, email: 'userB@test.com' }, secret);

    // Exhaust User A's bucket (100 requests)
    for (let i = 1; i <= 100; i++) {
      const res = await request('/api/resource', {
        headers: {
          'X-Forwarded-For': sharedIp,
          'Authorization': `Bearer ${tokenUserA}`
        }
      });
      assert.strictEqual(res.status, 200);
    }

    // User A's 101st request should be rate limited (429)
    const userARateLimited = await request('/api/resource', {
      headers: {
        'X-Forwarded-For': sharedIp,
        'Authorization': `Bearer ${tokenUserA}`
      }
    });
    assert.strictEqual(userARateLimited.status, 429, "User A's bucket should be exhausted");

    // User B on the same IP should NOT be affected
    const userBAllowed = await request('/api/resource', {
      headers: {
        'X-Forwarded-For': sharedIp,
        'Authorization': `Bearer ${tokenUserB}`
      }
    });
    assert.strictEqual(userBAllowed.status, 200, "User B on same IP must not be blocked by User A's exhaustion");
    console.log('✅ Passed: Authenticated users on shared IP have isolated token buckets\n');

    console.log('🎉 ALL TOKEN-BUCKET RATE LIMITER TESTS PASSED PERFECTLY!');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

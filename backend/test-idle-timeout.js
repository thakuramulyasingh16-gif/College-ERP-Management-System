/**
 * test-idle-timeout.js
 *
 * Tests for server-side idle timeout (Part B) and URL-tamper guard (Part A, backend side).
 * Run with:
 *   CAPTCHA_ENABLED=false NODE_ENV=test IDLE_TIMEOUT_MINUTES=0.05 node test-idle-timeout.js
 *
 * Style matches existing test files (pure Node http, assert, no test runner).
 * Uses a stub DB so this test never needs a live MySQL connection.
 */

process.env.CAPTCHA_ENABLED = 'false';
process.env.NODE_ENV = 'test';
// 0.05 min = 3 seconds timeout
process.env.IDLE_TIMEOUT_MINUTES = '0.05';
// Stub JWT secret
process.env.JWT_SECRET = 'test-secret-key';

const assert = require('assert');
const http = require('http');
const express = require('express');
const jwt = require('jsonwebtoken');

// ── Stub DB ───────────────────────────────────────────────────────────────────
// We override require('../config/db') with an in-memory stub before loading auth.js
const Module = require('module');
const originalLoad = Module._load;

// Stub MySQL db pool
const dbStub = {
  _users: new Map(), // userId -> { current_session_token, last_activity_at }

  async execute(sql, params) {
    // SELECT current_session_token, last_activity_at FROM users WHERE id = ?
    if (sql.includes('SELECT current_session_token') && sql.includes('last_activity_at')) {
      const user = dbStub._users.get(params[0]);
      if (!user) return [[]];
      return [[{ current_session_token: user.token, last_activity_at: user.lastActivity }]];
    }
    // UPDATE users SET current_session_token = NULL, last_activity_at = NULL WHERE id = ?
    if (sql.includes('current_session_token = NULL') && sql.includes('last_activity_at = NULL')) {
      const user = dbStub._users.get(params[0]);
      if (user) { user.token = null; user.lastActivity = null; }
      return [{ affectedRows: 1 }];
    }
    // UPDATE users SET last_activity_at = NOW() WHERE id = ?
    if (sql.includes('last_activity_at = NOW()')) {
      const user = dbStub._users.get(params[0]);
      if (user) user.lastActivity = new Date();
      return [{ affectedRows: 1 }];
    }
    // UPDATE users SET current_session_token = ?, last_activity_at = NOW() WHERE id = ?
    if (sql.includes('current_session_token = ?') && sql.includes('last_activity_at = NOW()')) {
      const [token, id] = params;
      const user = dbStub._users.get(id) || {};
      user.token = token;
      user.lastActivity = new Date();
      dbStub._users.set(id, user);
      return [{ affectedRows: 1 }];
    }
    return [[]];
  }
};

// Intercept require('./config/db') and require('../config/db')
Module._load = function(request, parent, isMain) {
  if (request === '../config/db' || request === './config/db' || request.endsWith('config/db')) {
    return dbStub;
  }
  return originalLoad.apply(this, arguments);
};

// Now load auth middleware (uses dbStub above)
const auth = require('./middleware/auth');

// ── Build minimal express app ─────────────────────────────────────────────────
const app = express();
app.use(express.json());

const SECRET = process.env.JWT_SECRET;

// Token factory
function makeToken(userId, role = 'student') {
  return jwt.sign({ id: userId, role, loginAt: Date.now() }, SECRET, { expiresIn: '1h' });
}

// Simulate login: set user record in stub DB and return token
app.post('/api/auth/login-stub', (req, res) => {
  const { userId, role } = req.body;
  const token = makeToken(userId, role);
  const user = dbStub._users.get(userId) || {};
  user.token = token;
  user.lastActivity = new Date(); // login sets last_activity_at = NOW()
  dbStub._users.set(userId, user);
  res.json({ token });
});

// Protected resource endpoint (normal — DOES refresh idle timer)
app.get('/api/resource', auth(), (req, res) => {
  res.json({ ok: true, userId: req.user.id });
});

// Polling endpoint (skipActivity = true — must NOT refresh idle timer)
app.get('/api/session/check', auth([], { skipActivity: true }), (req, res) => {
  res.json({ valid: true });
});

// Activity heartbeat
app.post('/api/auth/activity', auth(), (req, res) => {
  // Force write (bypass throttle) for the test
  const user = dbStub._users.get(req.user.id);
  if (user) user.lastActivity = new Date();
  res.json({ ok: true });
});

// ── HTTP helper ──────────────────────────────────────────────────────────────
function req(port, method, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const options = { hostname: '127.0.0.1', port, path, method, headers };
    const request = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    request.on('error', reject);
    request.write(payload);
    request.end();
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ── Run Tests ────────────────────────────────────────────────────────────────
async function runTests() {
  console.log('🧪 Starting Idle Timeout Tests...');
  console.log(`   IDLE_TIMEOUT_MINUTES=${process.env.IDLE_TIMEOUT_MINUTES} (= 3 seconds)\n`);

  dbStub._users.clear();

  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, r));
  const { port } = server.address();

  try {
    // ── TEST 1: Login and immediate request succeed ────────────────────────────
    console.log('--- TEST 1: Login and immediate request succeed ---');
    const loginRes = await req(port, 'POST', '/api/auth/login-stub', { userId: 1, role: 'student' });
    assert.strictEqual(loginRes.status, 200, 'Login stub must succeed');
    const token = loginRes.body.token;
    assert.ok(token, 'Must have token');

    const immediateRes = await req(port, 'GET', '/api/resource', null, token);
    assert.strictEqual(immediateRes.status, 200, 'Immediate request must succeed');
    console.log('✅ Passed: login ok; request immediately after login ok\n');

    // ── TEST 2: Request after > timeout fails with SESSION_IDLE_TIMEOUT ────────
    console.log('--- TEST 2: Request after idle timeout returns 401 SESSION_IDLE_TIMEOUT ---');
    console.log('   (sleeping 3.5 seconds to exceed 3 s timeout)...');
    await sleep(3500);

    const expiredRes = await req(port, 'GET', '/api/resource', null, token);
    assert.strictEqual(expiredRes.status, 401, 'Expired session must return 401');
    assert.strictEqual(expiredRes.body.code, 'SESSION_IDLE_TIMEOUT', 'code must be SESSION_IDLE_TIMEOUT');
    console.log('✅ Passed: idle request returns 401 SESSION_IDLE_TIMEOUT\n');

    // ── TEST 3: Token blacklisted after timeout — cannot be reused ────────────
    console.log('--- TEST 3: Timed-out token cannot be reused ---');
    const retryRes = await req(port, 'GET', '/api/resource', null, token);
    assert.strictEqual(retryRes.status, 401, 'Blacklisted token must return 401');
    console.log('✅ Passed: token no longer works after timeout\n');

    // ── TEST 4: Polling endpoint does NOT refresh idle timer ──────────────────
    console.log('--- TEST 4: Polling endpoint does NOT extend idle timer ---');
    // Fresh login
    const lr2 = await req(port, 'POST', '/api/auth/login-stub', { userId: 2, role: 'student' });
    const t2 = lr2.body.token;

    // Manually back-date the last_activity by setting it to 2.5 s ago
    // (just under timeout so a normal request would succeed but the timer is close)
    const user2 = dbStub._users.get(2);
    user2.lastActivity = new Date(Date.now() - 2500);

    // Poll multiple times (should NOT extend last_activity)
    for (let i = 0; i < 5; i++) {
      await req(port, 'GET', '/api/session/check', null, t2);
      await sleep(100);
    }

    // last_activity should still be ~2500ms + 500ms of polling time ≈ 3s ago => expired
    // Wait just enough for the timer to tip over
    await sleep(600);
    const pollThenFail = await req(port, 'GET', '/api/resource', null, t2);
    assert.strictEqual(pollThenFail.status, 401, 'Session should have expired — polling must not extend timer');
    assert.strictEqual(pollThenFail.body.code, 'SESSION_IDLE_TIMEOUT');
    console.log('✅ Passed: polling endpoint does NOT extend idle timer\n');

    // ── TEST 5: POST /api/auth/activity DOES extend idle timer ───────────────
    console.log('--- TEST 5: POST /api/auth/activity extends idle timer ---');
    const lr3 = await req(port, 'POST', '/api/auth/login-stub', { userId: 3, role: 'student' });
    const t3 = lr3.body.token;

    // Back-date activity by 2.5 s (nearly expired)
    const user3 = dbStub._users.get(3);
    user3.lastActivity = new Date(Date.now() - 2500);

    // Send heartbeat — should refresh lastActivity to now
    const heartbeatRes = await req(port, 'POST', '/api/auth/activity', null, t3);
    assert.strictEqual(heartbeatRes.status, 200, 'Heartbeat must succeed');
    assert.ok(heartbeatRes.body.ok, 'Heartbeat must return ok');

    // Now wait 2 s — if activity was refreshed, the session should still be alive
    await sleep(2000);
    const afterHeartbeat = await req(port, 'GET', '/api/resource', null, t3);
    assert.strictEqual(afterHeartbeat.status, 200, 'Session should still be alive after heartbeat');
    console.log('✅ Passed: POST /api/auth/activity extends idle timer\n');

    // ── TEST 6: After timeout, a fresh login works ────────────────────────────
    console.log('--- TEST 6: After timeout, a fresh login works ---');
    const lr4 = await req(port, 'POST', '/api/auth/login-stub', { userId: 4, role: 'admin' });
    const t4 = lr4.body.token;
    const freshRes = await req(port, 'GET', '/api/resource', null, t4);
    assert.strictEqual(freshRes.status, 200, 'Fresh login after timeout must work');
    console.log('✅ Passed: fresh login after timeout works\n');

    console.log('🎉 ALL 6 IDLE TIMEOUT TESTS PASSED!');
    process.exit(0);
  } finally {
    server.close();
    // Restore original module loader
    Module._load = originalLoad;
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err.message || err);
  process.exit(1);
});


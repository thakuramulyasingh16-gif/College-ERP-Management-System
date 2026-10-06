const assert = require('assert');
const http = require('http');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

process.env.JWT_SECRET = 'test-secret-forgot-password-flow';
process.env.NODE_ENV = 'production';

// In-memory mock database state
const mockUsers = {
  1: { id: 1, email: 'admin@college.com', mobile: '9876543210', role: 'admin', name: 'Super Admin', password: '', current_session_token: 'active_admin_session' },
  2: { id: 2, email: 'teacher@college.com', mobile: '9876543211', role: 'teacher', name: 'Dr. Sharma', password: '', current_session_token: 'active_teacher_session' },
  3: { id: 3, email: 'student@college.com', mobile: '9876543212', role: 'student', name: 'Rahul Verma', password: '', current_session_token: 'active_student_session' }
};

const mockStaff = {
  2: { id: 5, user_id: 2, teacher_code: 'TCH-001' }
};

const mockStudents = {
  3: { id: 10, user_id: 3, roll_no: '2023-BCA-001' }
};

// Mock db.execute before loading controllers
const db = require('./config/db');
db.execute = async (query, params = []) => {
  // Query for student / teacher lookup in requestOtp or verifyOtp:
  if (query.includes('FROM users u') && query.includes("u.role IN ('student', 'teacher')")) {
    const [p0, p1] = params;
    const identifier = String(p0 || '').toLowerCase();

    for (const [id, u] of Object.entries(mockUsers)) {
      if (u.role !== 'student' && u.role !== 'teacher') continue;
      const st = mockStudents[id];

      const matchesEmail = u.email.toLowerCase() === identifier;
      const matchesRoll = u.role === 'student' && st && st.roll_no && st.roll_no.toLowerCase() === identifier;

      if (matchesEmail || matchesRoll) {
        return [[{ ...u, roll_no: st ? st.roll_no : null }]];
      }
    }
    return [[]];
  }

  // Update password and invalidate session
  if (query.includes('UPDATE users SET password = ?, current_session_token = NULL WHERE id = ?')) {
    const [newHash, userId] = params;
    if (mockUsers[userId]) {
      mockUsers[userId].password = newHash;
      mockUsers[userId].current_session_token = null;
    }
    return [{ affectedRows: 1 }];
  }

  // Select user by id
  if (query.includes('FROM users WHERE id = ?')) {
    const uid = params[0];
    const u = mockUsers[uid];
    return [u ? [{ ...u }] : []];
  }

  return [[]];
};

const authController = require('./controllers/authController');
const { otpRequestRateLimiter, otpVerifyRateLimiter } = require('./middleware/rateLimiters');

async function runTests() {
  console.log('=== FORGOT PASSWORD & CHANGE PASSWORD BACKEND TEST SUITE ===\n');

  // Initialize passwords
  mockUsers[1].password = await bcrypt.hash('Admin@Pass123', 10);
  mockUsers[2].password = await bcrypt.hash('Teacher@Pass123', 10);
  mockUsers[3].password = await bcrypt.hash('Student@Pass123', 10);

  function mockReqRes(body = {}, headers = {}) {
    const req = { body, headers, ip: '127.0.0.1' };
    const res = {
      statusCode: 200,
      headers: {},
      jsonData: null,
      status(code) { this.statusCode = code; return this; },
      set(h, v) { this.headers[h] = v; return this; },
      json(data) { this.jsonData = data; return this; }
    };
    return { req, res };
  }

  // TEST 1: Request OTP - Reject if mobile is not exactly 10 digits
  {
    const { req, res } = mockReqRes({ identifier: 'student@college.com', mobile: '98765' });
    await authController.requestOtp(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert(res.jsonData.message.includes('10 digits'));
    console.log('  PASS: Test 1 - Mobile number must be exactly 10 digits (rejected 5-digit)');
  }

  // TEST 1b: Request OTP - Reject if mobile has letters
  {
    const { req, res } = mockReqRes({ identifier: 'student@college.com', mobile: '987654321a' });
    await authController.requestOtp(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert(res.jsonData.message.includes('10 digits'));
    console.log('  PASS: Test 1b - Mobile number non-numeric rejected');
  }

  // TEST 2: Submit a wrong ID+mobile combo — confirm "Not found in database" shows clearly
  {
    const { req, res } = mockReqRes({ identifier: 'doesnotexist@college.com', mobile: '9999999999' });
    await authController.requestOtp(req, res);
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.jsonData.message, 'Not found in database');
    console.log('  PASS: Test 2 - Wrong ID+mobile combo returns clear "Not found in database" error');
  }

  // TEST 3: Submit student's correct ROLL NUMBER but WRONG mobile — confirm "Not found in database"
  {
    const { req, res } = mockReqRes({ identifier: '2023-BCA-001', mobile: '9111111111' });
    await authController.requestOtp(req, res);
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.jsonData.message, 'Not found in database');
    console.log('  PASS: Test 3 - Student valid roll number with mismatched mobile returns "Not found in database"');
  }

  // TEST 4: Admin account ID + mobile must NOT generate OTP and return "Not found in database"
  {
    const { req, res } = mockReqRes({ identifier: 'admin@college.com', mobile: '9876543210' });
    await authController.requestOtp(req, res);
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.jsonData.message, 'Not found in database');
    const adminOtp = authController._getOtpForTesting(1);
    assert.strictEqual(adminOtp, undefined, 'Admin account must never receive or store an OTP');
    console.log('  PASS: Test 4 - Admin account strictly barred from forgot-password OTP generation');
  }

  // TEST 5: Submit student's correct EMAIL + correct mobile — confirm OTP flow proceeds
  let studentEmailOtp;
  {
    const { req, res } = mockReqRes({ identifier: 'student@college.com', mobile: '9876543212' });
    await authController.requestOtp(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.jsonData.success, true);
    const record = authController._getOtpForTesting(3);
    assert(record, 'Student OTP record should exist in store');
    assert.strictEqual(record.otp.length, 6);
    studentEmailOtp = record.otp;
    console.log(`  PASS: Test 5 - Student matched by EMAIL + mobile -> OTP generated (${studentEmailOtp})`);
  }

  // TEST 6: Submit the SAME student's correct ROLL NUMBER + correct mobile — confirm OTP flow proceeds identically
  let studentRollOtp;
  {
    const { req, res } = mockReqRes({ identifier: '2023-bca-001', mobile: '9876543212' });
    await authController.requestOtp(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.jsonData.success, true);
    const record = authController._getOtpForTesting(3);
    assert(record, 'Student OTP record should exist in store');
    assert.strictEqual(record.otp.length, 6);
    studentRollOtp = record.otp;
    console.log(`  PASS: Test 6 - Same Student matched by ROLL NUMBER + mobile -> OTP generated (${studentRollOtp})`);
  }

  // TEST 7: Submit a teacher's correct ID (email) + correct mobile — confirm OTP flow proceeds
  let teacherOtp;
  {
    const { req, res } = mockReqRes({ identifier: 'teacher@college.com', mobile: '9876543211' });
    await authController.requestOtp(req, res);
    assert.strictEqual(res.statusCode, 200);
    const record = authController._getOtpForTesting(2);
    assert(record, 'Teacher OTP record should exist');
    teacherOtp = record.otp;
    console.log(`  PASS: Test 7 - Teacher matched by Email/ID + mobile -> OTP generated (${teacherOtp})`);
  }

  // TEST 7b: Teacher with roll number or teacher code should NOT match (teachers have no roll-number lookup)
  {
    const { req, res } = mockReqRes({ identifier: 'TCH-001', mobile: '9876543211' });
    await authController.requestOtp(req, res);
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.jsonData.message, 'Not found in database');
    console.log('  PASS: Test 7b - Teacher cannot use non-email roll number code -> "Not found in database"');
  }

  // TEST 8: Verify valid Teacher OTP with teacher's email -> Returns 10-min reset token and deletes OTP
  let resetToken;
  {
    const { req, res } = mockReqRes({ identifier: 'teacher@college.com', otp: teacherOtp });
    await authController.verifyOtp(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert(res.jsonData.resetToken, 'Should return reset token');
    resetToken = res.jsonData.resetToken;
    const record = authController._getOtpForTesting(2);
    assert.strictEqual(record, undefined, 'OTP must be removed immediately upon verification (single-use)');
    console.log('  PASS: Test 8 - Teacher OTP verified, single-use OTP consumed, reset token issued');
  }

  // TEST 8b: Verify Student OTP using ROLL NUMBER (confirming dual-identifier works end-to-end)
  {
    const { req, res } = mockReqRes({ identifier: '2023-bca-001', otp: studentRollOtp });
    await authController.verifyOtp(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert(res.jsonData.resetToken, 'Should return reset token for student');
    console.log('  PASS: Test 8b - Student OTP verified using ROLL NUMBER as identifier');
  }

  // TEST 9: Reset Password - short password (< 8 chars) rejected
  {
    const { req, res } = mockReqRes({ resetToken, newPassword: 'short', confirmPassword: 'short' });
    await authController.resetForgotPassword(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert(res.jsonData.message.includes('8 characters'));
    console.log('  PASS: Test 9 - Passwords under 8 chars rejected with 400');
  }

  // TEST 10: Reset Password - passwords do not match rejected
  {
    const { req, res } = mockReqRes({ resetToken, newPassword: 'NewPassword123!', confirmPassword: 'MismatchPassword123!' });
    await authController.resetForgotPassword(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert(res.jsonData.message.includes('do not match'));
    console.log('  PASS: Test 10 - Password mismatch rejected with 400');
  }

  // TEST 11: Reset Password - Valid reset updates password in DB & sets current_session_token = null
  {
    const { req, res } = mockReqRes({ resetToken, newPassword: 'BrandNewSecurePassword123!', confirmPassword: 'BrandNewSecurePassword123!' });
    await authController.resetForgotPassword(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.jsonData.success, true);

    // Verify DB update
    const teacherUser = mockUsers[2];
    assert.strictEqual(teacherUser.current_session_token, null, 'Active session must be cleared to log out old sessions');
    const isNewMatch = await bcrypt.compare('BrandNewSecurePassword123!', teacherUser.password);
    assert.strictEqual(isNewMatch, true, 'New password must be bcrypt-hashed and match');
    console.log('  PASS: Test 11 - Password updated with bcrypt; current_session_token invalidated (logged out)');
  }

  // TEST 12: Single-use reset token cannot be reused
  {
    const { req, res } = mockReqRes({ resetToken, newPassword: 'BrandNewSecurePassword123!', confirmPassword: 'BrandNewSecurePassword123!' });
    await authController.resetForgotPassword(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert(res.jsonData.message.includes('expired or is invalid'));
    console.log('  PASS: Test 12 - Reset token invalidated after use; reuse rejected');
  }

  // TEST 13: Rate limiter for OTP requests (Max 3 per 15 min per identifier+mobile+IP)
  {
    otpRequestRateLimiter.resetAll();
    const mockNext = () => {};
    let blocked = false;

    for (let i = 1; i <= 4; i++) {
      const { req, res } = mockReqRes({ identifier: 'test_limit@college.com', mobile: '9876543219' });
      otpRequestRateLimiter(req, res, () => {});
      if (res.statusCode === 429) {
        blocked = true;
        assert(res.jsonData.message.includes('Too many OTP requests'));
      }
    }
    assert.strictEqual(blocked, true, '4th request must be blocked with 429');
    console.log('  PASS: Test 13 - OTP Request Rate Limiter enforces max 3 requests per 15 minutes');
  }

  // TEST 14: Rate limiter for OTP verify (Max 5 attempts)
  {
    otpVerifyRateLimiter.resetAll();
    let blocked = false;

    for (let i = 1; i <= 6; i++) {
      const { req, res } = mockReqRes({ identifier: 'test_limit@college.com', otp: '123456' });
      otpVerifyRateLimiter(req, res, () => {});
      if (res.statusCode === 429) {
        blocked = true;
        assert(res.jsonData.message.includes('Too many OTP verification attempts'));
      }
    }
    assert.strictEqual(blocked, true, '6th attempt must be blocked with 429');
    console.log('  PASS: Test 14 - OTP Verify Rate Limiter enforces max 5 attempts per window');
  }

  console.log('\n=== ALL 14 BACKEND TESTS PASSED WITH 100% SUCCESS ===\n');
}

runTests().catch(err => {
  console.error('\n❌ TEST RUNNER FAILED:', err);
  process.exit(1);
});

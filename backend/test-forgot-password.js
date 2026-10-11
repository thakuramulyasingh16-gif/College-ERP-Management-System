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
    const idParam = String(params[0] || '').toLowerCase();

    for (const [id, u] of Object.entries(mockUsers)) {
      if (u.role !== 'student' && u.role !== 'teacher') continue;
      const st = mockStudents[id];
      const sf = mockStaff[id];

      const matchesEmail = u.email.toLowerCase() === idParam;
      const matchesRoll = u.role === 'student' && st && (
        (st.roll_no && st.roll_no.toLowerCase() === idParam) ||
        String(st.id) === idParam ||
        String(u.id) === idParam
      );
      const matchesTeacher = u.role === 'teacher' && sf && (
        (sf.teacher_code && sf.teacher_code.toLowerCase() === idParam) ||
        `tch-${sf.id}`.toLowerCase() === idParam ||
        String(sf.id) === idParam ||
        String(u.id) === idParam
      );

      if (matchesEmail || matchesRoll || matchesTeacher) {
        return [[{
          ...u,
          roll_no: st ? st.roll_no : null,
          teacher_code: sf ? sf.teacher_code : null
        }]];
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
  console.log('=== FORGOT PASSWORD (ID + EMAIL) BACKEND TEST SUITE ===\n');

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

  // TEST 1: Request OTP - Reject if email is invalid format
  {
    const { req, res } = mockReqRes({ identifier: '2023-BCA-001', email: 'not-an-email' });
    await authController.requestOtp(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert(res.jsonData.message.includes('valid registered email'));
    console.log('  PASS: Test 1 - Invalid email format rejected with 400');
  }

  // TEST 1b: Request OTP - Reject if identifier is missing
  {
    const { req, res } = mockReqRes({ identifier: '', email: 'student@college.com' });
    await authController.requestOtp(req, res);
    assert.strictEqual(res.statusCode, 400);
    assert(res.jsonData.message.includes('required'));
    console.log('  PASS: Test 1b - Empty identifier rejected with 400');
  }

  // TEST 2: Submit a non-existent ID + email — confirm "Not found in database" shows clearly
  {
    const { req, res } = mockReqRes({ identifier: 'UNKNOWN-ROLL', email: 'doesnotexist@college.com' });
    await authController.requestOtp(req, res);
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.jsonData.message, 'Not found in database');
    console.log('  PASS: Test 2 - Unknown ID returns clear "Not found in database" error');
  }

  // TEST 3: Submit student's correct ROLL NUMBER but WRONG email — confirm "Not found in database"
  {
    const { req, res } = mockReqRes({ identifier: '2023-BCA-001', email: 'wrongemail@college.com' });
    await authController.requestOtp(req, res);
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.jsonData.message, 'Not found in database');
    console.log('  PASS: Test 3 - Student valid roll number with mismatched email returns "Not found in database"');
  }

  // TEST 4: Admin account ID + email must NOT generate OTP and return "Not found in database"
  {
    const { req, res } = mockReqRes({ identifier: 'admin@college.com', email: 'admin@college.com' });
    await authController.requestOtp(req, res);
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.jsonData.message, 'Not found in database');
    const adminOtp = authController._getOtpForTesting(1);
    assert.strictEqual(adminOtp, undefined, 'Admin account must never receive or store an OTP');
    console.log('  PASS: Test 4 - Admin account strictly barred from forgot-password OTP generation');
  }

  // TEST 5: Submit student's correct ROLL NUMBER + matching registered EMAIL — confirm OTP generated
  let studentRollOtp;
  {
    const { req, res } = mockReqRes({ identifier: '2023-BCA-001', email: 'student@college.com' });
    await authController.requestOtp(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.jsonData.success, true);
    assert.strictEqual(res.jsonData.message, 'OTP sent successfully to your registered email');
    const record = authController._getOtpForTesting(3);
    assert(record, 'Student OTP record should exist in store');
    assert.strictEqual(record.otp.length, 6);
    studentRollOtp = record.otp;
    console.log(`  PASS: Test 5 - Student matched by ROLL NUMBER + Email -> OTP generated (${studentRollOtp})`);
  }

  // TEST 6: Submit Teacher by Teacher Code + matching registered EMAIL — confirm OTP generated
  let teacherOtp;
  {
    const { req, res } = mockReqRes({ identifier: 'TCH-001', email: 'teacher@college.com' });
    await authController.requestOtp(req, res);
    assert.strictEqual(res.statusCode, 200);
    const record = authController._getOtpForTesting(2);
    assert(record, 'Teacher OTP record should exist');
    teacherOtp = record.otp;
    console.log(`  PASS: Test 6 - Teacher matched by Teacher Code (TCH-001) + Email -> OTP generated (${teacherOtp})`);
  }

  // TEST 7: Teacher by Staff ID format (tch-5) + matching registered EMAIL
  {
    const { req, res } = mockReqRes({ identifier: 'tch-5', email: 'teacher@college.com' });
    await authController.requestOtp(req, res);
    assert.strictEqual(res.statusCode, 200);
    const record = authController._getOtpForTesting(2);
    teacherOtp = record.otp;
    console.log('  PASS: Test 7 - Teacher matched by Staff ID format (tch-5) + Email');
  }

  // TEST 7b: Teacher with correct code but wrong email returns 404
  {
    const { req, res } = mockReqRes({ identifier: 'TCH-001', email: 'wrongteacher@college.com' });
    await authController.requestOtp(req, res);
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.jsonData.message, 'Not found in database');
    console.log('  PASS: Test 7b - Teacher with wrong email returns "Not found in database"');
  }

  // TEST 8: Verify valid Teacher OTP -> Returns 10-min reset token and deletes OTP (single-use)
  let resetToken;
  {
    const { req, res } = mockReqRes({ identifier: 'TCH-001', otp: teacherOtp });
    await authController.verifyOtp(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert(res.jsonData.resetToken, 'Should return reset token');
    resetToken = res.jsonData.resetToken;
    const record = authController._getOtpForTesting(2);
    assert.strictEqual(record, undefined, 'OTP must be removed immediately upon verification (single-use)');
    console.log('  PASS: Test 8 - Teacher OTP verified, single-use OTP consumed, reset token issued');
  }

  // TEST 8b: Verify Student OTP using ROLL NUMBER
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

  // TEST 13: Rate limiter for OTP requests (Max 3 per 15 min per identifier+email+IP)
  {
    otpRequestRateLimiter.resetAll();
    let blocked = false;

    for (let i = 1; i <= 4; i++) {
      const { req, res } = mockReqRes({ identifier: 'test_limit@college.com', email: 'test_limit@college.com' });
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

  // TEST 15: Email sending failure handled gracefully (500 without leaking SMTP details)
  {
    const emailService = require('./services/emailService');
    const originalSendOtpEmail = emailService.sendOtpEmail;

    // Simulate SMTP failure
    emailService.sendOtpEmail = async () => {
      return { success: false, error: 'SMTPConnectionError: 535 5.7.8 Username and Password not accepted' };
    };

    authController._clearOtpStoreForTesting();
    const { req, res } = mockReqRes({ identifier: '2023-BCA-001', email: 'student@college.com' });
    await authController.requestOtp(req, res);

    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res.jsonData.success, false);
    assert.strictEqual(res.jsonData.message, 'Could not send OTP, please try again later');
    assert(!JSON.stringify(res.jsonData).includes('SMTPConnectionError'), 'Must not leak SMTP details to client');
    assert.strictEqual(authController._getOtpForTesting(3), undefined, 'Failed send must delete pending OTP from store');

    // Restore original function
    emailService.sendOtpEmail = originalSendOtpEmail;
    console.log('  PASS: Test 15 - Email failure returns generic 500 error without leaking SMTP details');
  }

  // TEST 16: Verify HTML Email Template contains OTP, 5-minute expiry, and security advisory
  {
    const { generateOtpEmailTemplate } = require('./services/emailService');
    const html = generateOtpEmailTemplate('654321');
    assert(html.includes('654321'), 'HTML template must contain OTP');
    assert(html.includes('5 minutes'), 'HTML template must mention 5 minutes validity');
    assert(html.includes('never share this OTP'), 'HTML template must advise not to share');
    console.log('  PASS: Test 16 - HTML email template includes OTP, 5-min expiry, and confidentiality notice');
  }

  console.log('\n=== ALL 16 BACKEND TESTS PASSED WITH 100% SUCCESS ===\n');
}

runTests().catch(err => {
  console.error('\n❌ TEST RUNNER FAILED:', err);
  process.exit(1);
});

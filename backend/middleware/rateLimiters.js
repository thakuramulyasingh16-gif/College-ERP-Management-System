/**
 * Additional API abuse protection rate limiters (Phase 5)
 */

const { getClientIp } = require('./registerRateLimiter');

function createSimpleLimiter({ windowMs, maxAttempts, name, message }) {
  const store = new Map();

  function limiter(req, res, next) {
    const ip = getClientIp(req);
    const userId = req.user ? req.user.id : 'anon';
    const key = `${userId}::${ip}`;
    const now = Date.now();

    let timestamps = store.get(key) || [];
    timestamps = timestamps.filter(ts => now - ts < windowMs);

    if (timestamps.length >= maxAttempts) {
      const oldest = timestamps[0];
      const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
      res.set('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        success: false,
        message: message || `Too many requests for ${name}. Please try again later.`,
        retryAfter: retryAfterSeconds
      });
    }

    timestamps.push(now);
    store.set(key, timestamps);
    next();
  }

  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of store.entries()) {
      const active = timestamps.filter(ts => now - ts < windowMs);
      if (active.length === 0) {
        store.delete(key);
      } else {
        store.set(key, active);
      }
    }
  }, 5 * 60 * 1000);
  if (timer.unref) timer.unref();

  limiter.resetAll = () => store.clear();
  return limiter;
}

// 10 complaints per 15 minutes
const complaintRateLimiter = createSimpleLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 10,
  name: 'complaints',
  message: 'Too many complaints submitted. Please try again in 15 minutes.'
});

// 30 assignment submissions per 15 minutes
const submissionRateLimiter = createSimpleLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 30,
  name: 'submissions',
  message: 'Too many assignment submissions in a short period. Please try again in a few minutes.'
});

// 5 password reset requests per 15 minutes
const passwordResetRateLimiter = createSimpleLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 5,
  name: 'password-reset',
  message: 'Too many password reset requests. Please try again in 15 minutes.'
});

// 5 password change attempts per 15 minutes per user/IP
const changePasswordRateLimiter = createSimpleLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 5,
  name: 'change-password',
  message: 'Too many password change attempts. Please try again in 15 minutes.'
});

// 10 roll number update attempts per 15 minutes per user/IP
const rollNumberRateLimiter = createSimpleLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 10,
  name: 'roll-number',
  message: 'Too many roll number update attempts. Please try again in 15 minutes.'
});

// Max 3 OTP requests per 15 minutes per identifier+mobile+IP combo
function createOtpRequestLimiter() {
  const store = new Map();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 3;

  function limiter(req, res, next) {
    const rawId = req.body?.identifier || req.body?.email || '';
    const rawMobile = req.body?.mobile || '';
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]).trim() : (req.ip || '127.0.0.1');
    const key = `${String(rawId).trim().toLowerCase()}::${String(rawMobile).trim()}::${ip}`;
    const now = Date.now();

    let timestamps = store.get(key) || [];
    timestamps = timestamps.filter(ts => now - ts < windowMs);

    if (timestamps.length >= maxAttempts) {
      const oldest = timestamps[0];
      const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
      res.set('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        success: false,
        message: `Too many OTP requests. Please try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.`,
        retryAfter: retryAfterSeconds
      });
    }

    timestamps.push(now);
    store.set(key, timestamps);
    next();
  }

  limiter.resetAll = () => store.clear();
  return limiter;
}

const otpRequestRateLimiter = createOtpRequestLimiter();

// Max 5 OTP verification attempts per 15 minutes per IP/identifier
const otpVerifyRateLimiter = createSimpleLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 5,
  name: 'otp-verify',
  message: 'Too many OTP verification attempts. Please try again in 15 minutes.'
});

module.exports = {
  complaintRateLimiter,
  submissionRateLimiter,
  passwordResetRateLimiter,
  changePasswordRateLimiter,
  rollNumberRateLimiter,
  otpRequestRateLimiter,
  otpVerifyRateLimiter
};


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

module.exports = {
  complaintRateLimiter,
  submissionRateLimiter,
  passwordResetRateLimiter
};

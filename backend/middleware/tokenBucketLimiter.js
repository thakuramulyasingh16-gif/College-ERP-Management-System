/**
 * Global Token-Bucket Rate Limiter Middleware
 * 
 * Provides an additional, broader layer of API abuse protection against DoS,
 * scraping, and brute force requests across all /api routes.
 * 
 * Algorithm: Token Bucket
 * - Bucket capacity: 100 tokens per client
 * - Client key: Authenticated user ID (if logged in), otherwise client IP
 * - Refill rate: Configurable via TOKEN_BUCKET_REFILL_PER_SEC env var (default: 2 tokens/sec)
 * - Consumption: 1 token per request
 * - Complexity: O(1) in-memory storage per client { tokens, lastRefillTimestamp }
 * - Cleanup: Periodic timer prunes idle buckets to keep memory strictly bounded
 */

const jwt = require('jsonwebtoken');
const { getClientIp } = require('./registerRateLimiter');

// In-memory store: Map<clientKey, { tokens: number, lastRefillTimestamp: number }>
const bucketStore = new Map();

const BUCKET_CAPACITY = 100;
const DEFAULT_REFILL_PER_SEC = 2; // 2 tokens/sec (~120 requests/minute sustained)
const STALE_BUCKET_IDLE_MS = 5 * 60 * 1000; // 5 minutes of inactivity

/**
 * Returns the configured refill rate in tokens per second.
 */
function getRefillRate() {
  const envRate = parseFloat(process.env.TOKEN_BUCKET_REFILL_PER_SEC);
  return (!isNaN(envRate) && envRate > 0) ? envRate : DEFAULT_REFILL_PER_SEC;
}

/**
 * Resolves the client identifier.
 * Uses authenticated user ID if available (from req.user or valid Bearer JWT),
 * otherwise falls back to client IP via getClientIp().
 */
function getClientKey(req) {
  let userId = req.user ? req.user.id : null;

  if (!userId && req.headers && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    const token = req.headers.authorization.split(' ')[1];
    try {
      const secret = process.env.JWT_SECRET;
      const decoded = secret ? jwt.verify(token, secret) : jwt.decode(token);
      if (decoded && decoded.id) {
        userId = decoded.id;
      }
    } catch (_) {
      // Invalid/expired token - fallback to IP
    }
  }

  if (userId) {
    return `user:${userId}`;
  }
  return `ip:${getClientIp(req)}`;
}

/**
 * Express middleware implementing the token bucket algorithm.
 */
function tokenBucketLimiter(req, res, next) {
  const key = getClientKey(req);
  const now = Date.now();
  const refillRate = getRefillRate();

  let bucket = bucketStore.get(key);

  if (!bucket) {
    bucket = {
      tokens: BUCKET_CAPACITY,
      lastRefillTimestamp: now
    };
  } else {
    // Refill tokens proportional to time elapsed since last check
    const elapsedSeconds = (now - bucket.lastRefillTimestamp) / 1000;
    if (elapsedSeconds > 0) {
      bucket.tokens = Math.min(BUCKET_CAPACITY, bucket.tokens + (elapsedSeconds * refillRate));
      bucket.lastRefillTimestamp = now;
    }
  }

  // Check if bucket has at least 1 token available
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    bucketStore.set(key, bucket);
    return next();
  }

  // Bucket is empty: calculate how many seconds until at least 1 token is available
  bucketStore.set(key, bucket);
  const tokensNeeded = 1 - bucket.tokens;
  const retryAfterSeconds = Math.max(1, Math.ceil(tokensNeeded / refillRate));

  res.set('Retry-After', String(retryAfterSeconds));
  return res.status(429).json({
    success: false,
    message: `Too many requests. Global API rate limit exceeded. Please try again in ${retryAfterSeconds} second(s).`,
    retryAfter: retryAfterSeconds
  });
}

/**
 * Reset all bucket entries (useful for automated testing)
 */
function resetAll() {
  bucketStore.clear();
}

// Periodic cleanup of stale client buckets (unref to not block process termination)
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of bucketStore.entries()) {
    // If a bucket has been idle longer than STALE_BUCKET_IDLE_MS, it is fully refilled;
    // removing it frees memory and causes no loss of rate-limit state.
    if (now - bucket.lastRefillTimestamp >= STALE_BUCKET_IDLE_MS) {
      bucketStore.delete(key);
    }
  }
}, STALE_BUCKET_IDLE_MS);
if (cleanupTimer.unref) cleanupTimer.unref();

// Support both default function import and destructuring import
tokenBucketLimiter.tokenBucketLimiter = tokenBucketLimiter;
tokenBucketLimiter.resetAll = resetAll;
tokenBucketLimiter.getClientKey = getClientKey;
tokenBucketLimiter.getBucketStore = () => bucketStore;
tokenBucketLimiter.BUCKET_CAPACITY = BUCKET_CAPACITY;
tokenBucketLimiter.DEFAULT_REFILL_PER_SEC = DEFAULT_REFILL_PER_SEC;

module.exports = tokenBucketLimiter;

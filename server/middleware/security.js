/**
 * Baseline request security middleware: NoSQL-injection guard, CSRF origin
 * check, rate limiting, and shared helpers for CORS.
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function getAllowedOrigins() {
  const configured = (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (process.env.NODE_ENV === 'production') return configured;

  return [...new Set([...configured, 'http://localhost:5173', 'http://127.0.0.1:5173'])];
}

function hasUnsafeKeys(value, depth = 0) {
  if (depth > 6 || value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some((item) => hasUnsafeKeys(item, depth + 1));

  for (const key of Object.keys(value)) {
    if (key.startsWith('$') || key.includes('.') || BLOCKED_KEYS.has(key)) return true;
    if (hasUnsafeKeys(value[key], depth + 1)) return true;
  }
  return false;
}

/**
 * Reject Mongo operator injection (`$gt`, `$where`, dotted paths, prototypes)
 * before any value reaches a query.
 */
function blockInjection(req, res, next) {
  const unsafe =
    hasUnsafeKeys(req.body) || hasUnsafeKeys(req.params) || hasUnsafeKeys(req.query);

  if (unsafe) {
    return res.status(400).json({ message: 'Request contains invalid characters.' });
  }
  return next();
}

/**
 * CSRF protection for cookie-based sessions: every state-changing request must
 * come from an allowed origin. Bearer-token API clients send no Origin and are
 * unaffected.
 */
function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get('origin');
  const referer = req.get('referer');
  const allowed = getAllowedOrigins();

  let source = null;
  if (origin) {
    source = origin;
  } else if (referer) {
    try {
      source = new URL(referer).origin;
    } catch {
      source = null;
    }
  }

  if (source) {
    if (allowed.includes(source)) return next();
    return res.status(403).json({ message: 'Cross-site request blocked.' });
  }

  // No Origin/Referer: allow stateless Bearer clients, block cookie-authenticated writes.
  const hasSessionCookie = Boolean((req.headers.cookie || '').includes('ca_token='));
  if (hasSessionCookie) {
    return res.status(403).json({ message: 'Request origin could not be verified.' });
  }
  return next();
}

/**
 * Small in-memory fixed-window rate limiter.
 * rateLimit({ windowMs, max, keyPrefix })
 */
function rateLimit({
  windowMs = 60 * 1000,
  max = 100,
  message,
  keyPrefix = 'default',
  skipSuccessful = false,
} = {}) {
  const buckets = new Map();

  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of buckets) {
      if (now > entry.resetAt) buckets.delete(key);
    }
  }, windowMs);
  if (typeof timer.unref === 'function') timer.unref();

  return function limiter(req, res, next) {
    const identity = req.user?._id?.toString() || req.ip || req.socket?.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${identity}`;
    const now = Date.now();
    const entry = buckets.get(key);

    if (!entry || now > entry.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;

    // Successful sign-ins should not use up the failed-attempt budget.
    if (skipSuccessful) {
      res.on('finish', () => {
        if (res.statusCode < 400) {
          const bucket = buckets.get(key);
          if (bucket) bucket.count = Math.max(0, bucket.count - 1);
        }
      });
    }

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        message: message || 'Too many requests. Please wait a moment and try again.',
      });
    }
    return next();
  };
}

module.exports = {
  blockInjection,
  csrfProtection,
  rateLimit,
  getAllowedOrigins,
  hasUnsafeKeys,
};

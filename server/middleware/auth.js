const jwt = require('jsonwebtoken');
const User = require('../models/User');

const COOKIE_NAME = 'ca_token';
const ISSUER = 'climate-adaptation-assistant';
const AUDIENCE = 'caa-web';
const ALGORITHM = 'HS256';

function assertJwtSecret() {
  const secret = process.env.JWT_SECRET || '';
  if (secret.length < 32 || /change-me/i.test(secret)) {
    throw new Error(
      'JWT_SECRET must be a random string of at least 32 characters (e.g. openssl rand -hex 32).'
    );
  }
  return secret;
}

function cookieOptions(remember) {
  const days = Number(process.env.JWT_EXPIRES_DAYS || 7);
  const base = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
  return remember
    ? { ...base, maxAge: days * 24 * 60 * 60 * 1000 }
    : base; // session cookie when "remember me" is not checked
}

function signToken(user, remember) {
  const days = Number(process.env.JWT_EXPIRES_DAYS || 7);
  return jwt.sign({ sub: user._id.toString(), purpose: 'session' }, assertJwtSecret(), {
    expiresIn: remember ? `${days}d` : '12h',
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithm: ALGORITHM,
  });
}

/** Short-lived token returned after a correct password when MFA is enabled. */
function signMfaChallenge(user) {
  return jwt.sign({ sub: user._id.toString(), purpose: 'mfa' }, assertJwtSecret(), {
    expiresIn: '5m',
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithm: ALGORITHM,
  });
}

function verifyMfaChallenge(token) {
  return jwt.verify(token, assertJwtSecret(), {
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithms: [ALGORITHM],
  });
}

function readToken(req) {
  if (req.cookies && req.cookies[COOKIE_NAME]) return req.cookies[COOKIE_NAME];
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

async function requireAuth(req, res, next) {
  const token = readToken(req);
  if (!token) {
    return res.status(401).json({ message: 'Please sign in to continue.' });
  }
  try {
    const payload = jwt.verify(token, assertJwtSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: [ALGORITHM],
    });

    if (payload.purpose !== 'session') {
      return res.status(401).json({ message: 'Please sign in to continue.' });
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ message: 'Your session is no longer valid. Please sign in again.' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
  }
}

/** Admin-only guard. Always used after requireAuth. */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Please sign in to continue.' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'You do not have permission to do that.' });
  }
  return next();
}

/** Emails listed in ADMIN_EMAILS are promoted to admin on sign-in. */
function configuredAdminEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

async function promoteIfConfigured(user) {
  if (!user) return user;
  if (user.role === 'admin') return user;
  if (configuredAdminEmails().includes(String(user.email).toLowerCase())) {
    user.role = 'admin';
    await user.save();
  }
  return user;
}

module.exports = {
  requireAuth,
  requireAdmin,
  promoteIfConfigured,
  signToken,
  signMfaChallenge,
  verifyMfaChallenge,
  cookieOptions,
  assertJwtSecret,
  COOKIE_NAME,
  ISSUER,
  AUDIENCE,
};

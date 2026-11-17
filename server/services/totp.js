/**
 * Time-based one-time passwords (RFC 6238) implemented with Node's crypto only,
 * so multi-factor authentication needs no extra dependency.
 *
 * Secrets are base32 (as required by authenticator apps) and codes are valid
 * for 30 seconds with a one-step clock-skew window.
 */

const crypto = require('crypto');

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const DIGITS = 6;
const PERIOD = 30;

function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(input) {
  const clean = String(input).toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes = [];

  for (const char of clean) {
    const index = ALPHABET.indexOf(char);
    if (index === -1) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function generateSecret(bytes = 20) {
  return base32Encode(crypto.randomBytes(bytes));
}

function hotp(secret, counter) {
  const key = base32Decode(secret);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));

  const digest = crypto.createHmac('sha1', key).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
}

function generateTotp(secret, timestamp = Date.now()) {
  return hotp(secret, Math.floor(timestamp / 1000 / PERIOD));
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

/** Verify a code, allowing one period before and after the current time. */
function verifyTotp(secret, token, window = 1, timestamp = Date.now()) {
  const code = String(token || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(code)) return false;

  const counter = Math.floor(timestamp / 1000 / PERIOD);
  for (let offset = -window; offset <= window; offset += 1) {
    const expected = hotp(secret, counter + offset);
    if (safeEqual(expected, code)) return true;
  }
  return false;
}

function keyUri({ secret, email, issuer = 'Climate Adaptation Assistant' }) {
  const label = encodeURIComponent(`${issuer}:${email || 'account'}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(PERIOD),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

function generateBackupCodes(count = 8) {
  const codes = [];
  for (let index = 0; index < count; index += 1) {
    codes.push(crypto.randomBytes(5).toString('hex').toUpperCase());
  }
  return codes;
}

function hashBackupCode(code) {
  return crypto.createHash('sha256').update(String(code).trim().toUpperCase()).digest('hex');
}

module.exports = {
  generateSecret,
  generateTotp,
  verifyTotp,
  keyUri,
  generateBackupCodes,
  hashBackupCode,
};

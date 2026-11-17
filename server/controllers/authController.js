const crypto = require('crypto');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const {
  signToken,
  signMfaChallenge,
  verifyMfaChallenge,
  cookieOptions,
  promoteIfConfigured,
  COOKIE_NAME,
} = require('../middleware/auth');
const {
  generateSecret,
  verifyTotp,
  keyUri,
  generateBackupCodes,
  hashBackupCode,
} = require('../services/totp');

function maskEmail(email) {
  const [name, domain] = String(email || '').split('@');
  if (!domain) return 'unknown';
  return `${name.slice(0, 2)}***@${domain}`;
}

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (existing) {
    return res.status(409).json({ message: 'An account with this email already exists.', field: 'email' });
  }

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({
    name: String(name).trim(),
    email: String(email).toLowerCase().trim(),
    passwordHash,
  });

  await promoteIfConfigured(user);

  const token = signToken(user, true);
  res.cookie(COOKIE_NAME, token, cookieOptions(true));
  return res.status(201).json({ user: user.toPublicJSON() });
});

const login = asyncHandler(async (req, res) => {
  const { email, password, remember } = req.body;

  const user = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (!user) {
    return res.status(401).json({ message: 'Email or password is incorrect.' });
  }

  const matches = await user.comparePassword(password);
  if (!matches) {
    return res.status(401).json({ message: 'Email or password is incorrect.' });
  }

  await promoteIfConfigured(user);

  // Password is correct, but a second factor is required before a session is issued.
  if (user.mfaEnabled) {
    return res.json({
      mfaRequired: true,
      challenge: signMfaChallenge(user),
      message: 'Enter the 6-digit code from your authenticator app.',
    });
  }

  const token = signToken(user, Boolean(remember));
  res.cookie(COOKIE_NAME, token, cookieOptions(Boolean(remember)));
  return res.json({ user: user.toPublicJSON() });
});

const verifyMfaLogin = asyncHandler(async (req, res) => {
  const { challenge, code, remember } = req.body;

  let payload;
  try {
    payload = verifyMfaChallenge(String(challenge));
  } catch {
    return res.status(401).json({ message: 'This verification step expired. Please sign in again.' });
  }

  if (payload.purpose !== 'mfa') {
    return res.status(401).json({ message: 'Invalid verification step.' });
  }

  const user = await User.findById(payload.sub).select('+mfaSecret +mfaBackupCodes');
  if (!user || !user.mfaEnabled || !user.mfaSecret) {
    return res.status(401).json({ message: 'Two-factor authentication is not available for this account.' });
  }

  const submitted = String(code || '').trim().toUpperCase();
  const validTotp = verifyTotp(user.mfaSecret, submitted);

  let usedBackupCode = false;
  if (!validTotp) {
    const hash = hashBackupCode(submitted);
    if (user.mfaBackupCodes.includes(hash)) {
      user.mfaBackupCodes = user.mfaBackupCodes.filter((item) => item !== hash);
      usedBackupCode = true;
    }
  }

  if (!validTotp && !usedBackupCode) {
    return res.status(401).json({ message: 'That code is not valid. Check the app and try again.' });
  }

  await user.save();

  const token = signToken(user, Boolean(remember));
  res.cookie(COOKIE_NAME, token, cookieOptions(Boolean(remember)));
  return res.json({
    user: user.toPublicJSON(),
    usedBackupCode,
    remainingBackupCodes: user.mfaBackupCodes.length,
  });
});

const me = asyncHandler(async (req, res) => {
  return res.json({ user: req.user.toPublicJSON() });
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(true), maxAge: undefined });
  return res.json({ message: 'Signed out.' });
});

/** Start MFA enrolment: returns a secret and otpauth:// URI for the authenticator app. */
const setupMfa = asyncHandler(async (req, res) => {
  const secret = generateSecret();

  req.user.mfaPendingSecret = secret;
  await req.user.save();

  return res.json({
    secret,
    otpauthUri: keyUri({ secret, email: req.user.email }),
    message: 'Add this secret to your authenticator app, then confirm with a 6-digit code.',
  });
});

/** Confirm enrolment with a code from the app; returns one-time backup codes. */
const enableMfa = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+mfaPendingSecret +mfaSecret +mfaBackupCodes');

  if (!user.mfaPendingSecret) {
    return res.status(400).json({ message: 'Start two-factor setup first.' });
  }
  if (!verifyTotp(user.mfaPendingSecret, req.body.code)) {
    return res.status(400).json({ message: 'That code is not valid. Wait for the next code and try again.' });
  }

  const backupCodes = generateBackupCodes();
  user.mfaSecret = user.mfaPendingSecret;
  user.mfaPendingSecret = null;
  user.mfaEnabled = true;
  user.mfaBackupCodes = backupCodes.map(hashBackupCode);
  await user.save();

  return res.json({
    message: 'Two-factor authentication is now on.',
    mfaEnabled: true,
    backupCodes,
  });
});

/** Turn MFA off - requires the current password. */
const disableMfa = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  const matches = await user.comparePassword(req.body.password || '');
  if (!matches) {
    return res.status(401).json({ message: 'Password is incorrect.' });
  }

  user.mfaEnabled = false;
  user.mfaSecret = null;
  user.mfaPendingSecret = null;
  user.mfaBackupCodes = [];
  await user.save();

  return res.json({ message: 'Two-factor authentication has been turned off.', mfaEnabled: false });
});

/**
 * Password reset without an email provider: the reset link is printed in the
 * server log. Configure an email service to deliver it to the user instead.
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const email = String(req.body.email).toLowerCase().trim();
  const user = await User.findOne({ email });
  const generic = {
    message: 'If an account exists for that email, a password reset link has been generated.',
  };

  if (!user) return res.json(generic);

  const token = crypto.randomBytes(32).toString('hex');
  user.resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
  user.resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000);
  await user.save();

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const exposeLink = process.env.NODE_ENV !== 'production' && process.env.EXPOSE_RESET_LINK === 'true';

  // Never log the raw token in production; log a masked account reference only.
  if (exposeLink) {
    console.log(`[auth] Password reset link for ${maskEmail(email)}: ${clientUrl}/reset-password?token=${token}`);
  } else {
    console.log(`[auth] Password reset requested for ${maskEmail(email)}. Check the reset link delivery log.`);
  }

  return res.json({
    ...generic,
    deliverToServerLog: true,
    ...(exposeLink ? { resetUrl: `${clientUrl}/reset-password?token=${token}` } : {}),
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const hash = crypto.createHash('sha256').update(String(token)).digest('hex');

  const user = await User.findOne({
    resetTokenHash: hash,
    resetTokenExpires: { $gt: new Date() },
  }).select('+resetTokenHash +resetTokenExpires');

  if (!user) {
    return res.status(400).json({ message: 'This reset link is invalid or has expired.' });
  }

  user.passwordHash = await User.hashPassword(password);
  user.resetTokenHash = null;
  user.resetTokenExpires = null;
  await user.save();

  return res.json({ message: 'Password updated. You can sign in with your new password.' });
});

module.exports = {
  register,
  login,
  verifyMfaLogin,
  me,
  logout,
  setupMfa,
  enableMfa,
  disableMfa,
  forgotPassword,
  resetPassword,
};

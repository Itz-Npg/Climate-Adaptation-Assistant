const express = require('express');
const { body } = require('express-validator');
const { handleValidation } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { rateLimit } = require('../middleware/security');
const controller = require('../controllers/authController');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyPrefix: 'auth',
  message: 'Too many attempts. Please wait 15 minutes and try again.',
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyPrefix: 'register',
  message: 'Too many accounts created from this address. Please try again later.',
});

const mfaLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  keyPrefix: 'mfa',
  message: 'Too many verification attempts. Please wait a few minutes.',
});

const passwordRule = body('password')
  .isLength({ min: 8, max: 128 })
  .withMessage('Password must be at least 8 characters.')
  .matches(/[A-Za-z]/)
  .withMessage('Password must include a letter.')
  .matches(/[0-9]/)
  .withMessage('Password must include a number.');

const codeRule = body('code')
  .trim()
  .notEmpty()
  .withMessage('Enter the 6-digit code from your authenticator app.')
  .isLength({ min: 6, max: 16 })
  .withMessage('Enter a valid code.');

router.post(
  '/register',
  registerLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Please enter your full name.'),
    body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
    passwordRule,
  ],
  handleValidation,
  controller.register
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  handleValidation,
  controller.login
);

router.post(
  '/mfa/verify',
  mfaLimiter,
  [body('challenge').notEmpty().withMessage('Verification step is missing.'), codeRule],
  handleValidation,
  controller.verifyMfaLogin
);

router.post('/mfa/setup', requireAuth, mfaLimiter, controller.setupMfa);

router.post(
  '/mfa/enable',
  requireAuth,
  mfaLimiter,
  [codeRule],
  handleValidation,
  controller.enableMfa
);

router.post(
  '/mfa/disable',
  requireAuth,
  mfaLimiter,
  [body('password').notEmpty().withMessage('Enter your password to turn off two-factor authentication.')],
  handleValidation,
  controller.disableMfa
);

router.post(
  '/forgot-password',
  authLimiter,
  [body('email').trim().isEmail().withMessage('Enter a valid email address.')],
  handleValidation,
  controller.forgotPassword
);

router.post(
  '/reset-password',
  authLimiter,
  [body('token').notEmpty().withMessage('Reset token is missing.'), passwordRule],
  handleValidation,
  controller.resetPassword
);

router.get('/me', requireAuth, controller.me);
router.post('/logout', controller.logout);

module.exports = router;

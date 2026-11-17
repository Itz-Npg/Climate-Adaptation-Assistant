const express = require('express');
const { body, param } = require('express-validator');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');
const { rateLimit } = require('../middleware/security');
const controller = require('../controllers/adminController');

const router = express.Router();

// Every admin route requires a signed-in session AND the admin role.
router.use(requireAuth, requireAdmin);

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  keyPrefix: 'admin-write',
  message: 'Too many admin changes. Please slow down.',
});

const idRule = param('id').isMongoId().withMessage('Invalid user id.');

router.get('/stats', controller.getStats);
router.get('/users', controller.listUsers);
router.get('/users/:id', [idRule], handleValidation, controller.getUser);

router.patch(
  '/users/:id/role',
  writeLimiter,
  [idRule, body('role').isIn(['user', 'admin']).withMessage('Role must be user or admin.')],
  handleValidation,
  controller.updateRole
);

router.post('/users/:id/reset-mfa', writeLimiter, [idRule], handleValidation, controller.resetMfa);

router.delete('/users/:id', writeLimiter, [idRule], handleValidation, controller.deleteUser);

module.exports = router;

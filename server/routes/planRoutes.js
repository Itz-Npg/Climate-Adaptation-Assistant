const express = require('express');
const { body } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');
const controller = require('../controllers/planController');

const router = express.Router();

router.use(requireAuth);

const titleRule = body('title').trim().isLength({ min: 3 }).withMessage('Give the plan a title of at least 3 characters.');

router.post('/', [titleRule], handleValidation, controller.createPlan);
router.get('/', controller.listPlans);
router.get('/:id', controller.getPlan);
router.put('/:id', controller.updatePlan);
router.delete('/:id', controller.deletePlan);

module.exports = router;

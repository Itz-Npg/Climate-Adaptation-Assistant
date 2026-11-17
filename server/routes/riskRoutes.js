const express = require('express');
const { body } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');
const controller = require('../controllers/riskController');

const router = express.Router();

router.use(requireAuth);

router.post(
  '/',
  [
    body('city').trim().notEmpty().withMessage('City is required.'),
    body('country').trim().notEmpty().withMessage('Country is required.'),
    body('locationType').trim().notEmpty().withMessage('Location type is required.'),
    body('housingType').trim().notEmpty().withMessage('Housing type is required.'),
    body('waterBody').trim().notEmpty().withMessage('Nearby water body is required.'),
    body('drainage').trim().notEmpty().withMessage('Drainage condition is required.'),
    body('climate').trim().notEmpty().withMessage('Local climate is required.'),
  ],
  handleValidation,
  controller.createRisk
);

router.get('/', controller.listRisks);
router.get('/:id', controller.getRisk);
router.delete('/:id', controller.deleteRisk);

module.exports = router;

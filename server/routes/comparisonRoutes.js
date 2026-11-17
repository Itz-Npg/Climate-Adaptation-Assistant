const express = require('express');
const { requireAuth } = require('../middleware/auth');
const controller = require('../controllers/comparisonController');

const router = express.Router();

router.use(requireAuth);

router.post('/', controller.createComparison);
router.get('/', controller.listComparisons);
router.delete('/:id', controller.deleteComparison);

module.exports = router;

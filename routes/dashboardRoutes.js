const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware.protect);
router.use(authMiddleware.restrictTo('guru'));

// GET /api/dashboard/summary
router.get('/summary', dashboardController.getDashboardSummary);

module.exports = router;
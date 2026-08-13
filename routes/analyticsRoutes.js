const express = require('express');
const router = express.Router();
const { getCategoryBreakdown, getItemPriceHistory } = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

router.get('/category-breakdown', protect, getCategoryBreakdown);
router.get('/price-history', protect, getItemPriceHistory);

module.exports = router;

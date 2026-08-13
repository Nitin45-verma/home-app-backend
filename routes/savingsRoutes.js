const express = require('express');
const router = express.Router();
const { getGullakBalance } = require('../controllers/savingsController');
const { protect } = require('../middleware/authMiddleware');

router.get('/gullak', protect, getGullakBalance);

module.exports = router;

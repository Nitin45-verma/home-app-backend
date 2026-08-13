const express = require('express');
const router = express.Router();
const { addReminder, getReminders, payReminder } = require('../controllers/reminderController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, addReminder);
router.get('/', protect, getReminders);
router.put('/:id/pay', protect, payReminder);

module.exports = router;

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { addExpense, getMonthlyExpenses, voiceParseExpense, scanBill } = require('../controllers/expenseController');
const { protect } = require('../middleware/authMiddleware');

// Configure multer memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

router.post('/', protect, addExpense);
router.get('/monthly', protect, getMonthlyExpenses);
router.post('/voice-parse', protect, voiceParseExpense);
router.post('/scan-bill', protect, upload.single('bill'), scanBill);

module.exports = router;

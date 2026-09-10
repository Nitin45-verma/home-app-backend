const express = require('express');
const router = express.Router();
const { onboardUser, getUserProfile, updateUserProfile, completeOnboarding, spinWheel, changeUserPassword } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// All profile/onboarding routes are protected
router.put('/onboard', protect, onboardUser);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.put('/complete-onboarding', protect, completeOnboarding);
router.post('/spin-wheel', protect, spinWheel);
router.put('/change-password', protect, changeUserPassword);

module.exports = router;

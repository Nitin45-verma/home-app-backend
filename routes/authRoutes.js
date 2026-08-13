const express = require('express');
const router = express.Router();
const {
  sendEmailOtp,
  verifyEmailOtp,
  loginOrVerify,
  loginRegister,
  registerUser,
  loginUser
} = require('../controllers/authController');

// OTP Email Verification Endpoints
router.post('/send-otp', sendEmailOtp);
router.post('/verify-otp', verifyEmailOtp);

// Dedicated and unified endpoints
router.post('/login-register', loginRegister);
router.post('/register', registerUser);
router.post('/login', loginUser);

// Legacy/Compatibility endpoints
router.post('/verify', loginOrVerify);

module.exports = router;

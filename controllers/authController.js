const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const { sendVerificationEmail } = require('../utils/emailService');

// Generate JWT Helper
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d',
  });
};

/**
 * Format user object helper
 */
const formatUserResponse = (user) => ({
  id: user._id,
  userId: user.userId,
  name: user.name,
  emailPhone: user.emailPhone,
  monthlyBudget: user.monthlyBudget,
  preferredLanguage: user.preferredLanguage,
  isFirstTimeUser: user.isFirstTimeUser,
  isEmailVerified: user.isEmailVerified || false,
  savingsName: user.savingsName,
  savingsTarget: user.savingsTarget,
  savingsAchieved: user.savingsAchieved,
  savingsGullakBalance: user.savingsGullakBalance,
  rewardPoints: user.rewardPoints || 0,
});

/**
 * @desc    Send 6-digit Email Verification OTP via Nodemailer
 * @route   POST /api/auth/send-otp
 * @access  Public
 */
const sendEmailOtp = async (req, res, next) => {
  try {
    const { email, emailPhone } = req.body;
    const targetEmail = (email || emailPhone || '').trim();

    if (!targetEmail || !targetEmail.includes('@')) {
      res.status(400);
      throw new Error('Please enter a valid email address / कृपया एक मान्य ईमेल पता दर्ज करें');
    }

    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Check if user exists, else create user record shell
    let user = await User.findOne({ emailPhone: targetEmail });
    if (!user) {
      const generatedUserId = uuidv4();
      user = await User.create({
        userId: generatedUserId,
        emailPhone: targetEmail,
        isFirstTimeUser: true,
        isEmailVerified: false,
        emailOtp: otp,
        emailOtpExpires: otpExpires,
      });
    } else {
      user.emailOtp = otp;
      user.emailOtpExpires = otpExpires;
      await user.save();
    }

    // Send email using Nodemailer
    const emailResult = await sendVerificationEmail(targetEmail, otp);

    res.status(200).json({
      success: true,
      message: 'Verification code sent to your email / सत्यापन कोड आपके ईमेल पर भेज दिया गया है',
      simulated: emailResult.simulated || false,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify 6-digit Email Verification OTP
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
const verifyEmailOtp = async (req, res, next) => {
  try {
    const { email, emailPhone, otp } = req.body;
    const targetEmail = (email || emailPhone || '').trim();
    const cleanOtp = (otp || '').trim();

    if (!targetEmail || !cleanOtp) {
      res.status(400);
      throw new Error('Email and verification code are required / ईमेल और सत्यापन कोड आवश्यक हैं');
    }

    const user = await User.findOne({ emailPhone: targetEmail });
    if (!user) {
      res.status(404);
      throw new Error('Account not found for this email / इस ईमेल के लिए खाता नहीं मिला');
    }

    if (!user.emailOtp || user.emailOtp !== cleanOtp) {
      res.status(400);
      throw new Error('Invalid verification code / अमान्य सत्यापन कोड');
    }

    if (user.emailOtpExpires && new Date() > new Date(user.emailOtpExpires)) {
      res.status(400);
      throw new Error('Verification code has expired. Please request a new code. / सत्यापन कोड समाप्त हो गया है। कृपया नया कोड माँगें।');
    }

    // Mark email as verified and clear OTP
    user.isEmailVerified = true;
    user.emailOtp = null;
    user.emailOtpExpires = null;
    await user.save();

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! / ईमेल सफलतापूर्वक सत्यापित हो गया!',
      token,
      isFirstTimeUser: user.isFirstTimeUser,
      user: formatUserResponse(user),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate user / Session validation or Registration
 * @route   POST /api/auth/verify
 * @access  Public
 */
const loginOrVerify = async (req, res, next) => {
  try {
    const { emailPhone, phone } = req.body;
    const identifier = emailPhone || phone;

    if (!identifier) {
      res.status(400);
      throw new Error('Please provide email/phone / कृपया ईमेल/फोन नंबर प्रदान करें');
    }

    let user = await User.findOne({ emailPhone: identifier });
    let isNewUserCreated = false;

    if (!user) {
      const generatedUserId = uuidv4();
      user = await User.create({
        userId: generatedUserId,
        emailPhone: identifier,
        isFirstTimeUser: true,
      });
      isNewUserCreated = true;
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      isNewUserCreated,
      user: formatUserResponse(user),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Unified login and registration endpoint
 * @route   POST /api/auth/login-register
 * @access  Public
 */
const loginRegister = async (req, res, next) => {
  try {
    const { email, phone } = req.body;
    const identifier = email || phone;

    if (!identifier) {
      res.status(400);
      throw new Error('Please provide email or phone / कृपया ईमेल या फोन नंबर प्रदान करें');
    }

    let user = await User.findOne({ emailPhone: identifier });
    let isFirstTime = true;

    if (user) {
      isFirstTime = user.isFirstTimeUser;
    } else {
      const generatedUserId = uuidv4();
      user = await User.create({
        userId: generatedUserId,
        emailPhone: identifier,
        isFirstTimeUser: true,
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      isFirstTimeUser: isFirstTime,
      user: formatUserResponse(user),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Dedicated registration endpoint
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res, next) => {
  try {
    const { email, phone, password } = req.body;
    const identifier = email || phone;

    if (!identifier) {
      res.status(400);
      throw new Error('Please provide email or phone / कृपया ईमेल या फोन नंबर प्रदान करें');
    }

    const userExists = await User.findOne({ emailPhone: identifier });
    if (userExists) {
      res.status(400);
      throw new Error('Account already exists. Please Log In. / खाता पहले से मौजूद है। कृपया लॉग इन करें।');
    }

    const generatedUserId = uuidv4();
    const newUser = await User.create({
      userId: generatedUserId,
      emailPhone: identifier,
      password: password || '',
      isFirstTimeUser: true,
      isEmailVerified: false,
    });

    const token = generateToken(newUser._id);

    res.status(201).json({
      success: true,
      token,
      isFirstTimeUser: true,
      user: formatUserResponse(newUser),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Dedicated login endpoint
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res, next) => {
  try {
    const { email, phone, password } = req.body;
    const identifier = email || phone;

    if (!identifier) {
      res.status(400);
      throw new Error('Please provide email or phone / कृपया ईमेल या फोन नंबर प्रदान करें');
    }

    const user = await User.findOne({ emailPhone: identifier });
    if (!user) {
      res.status(404);
      throw new Error('Account does not exist. Please Register first. / खाता मौजूद नहीं है। कृपया पहले पंजीकरण करें।');
    }

    if (user.password !== '' && password !== undefined && user.password !== password) {
      res.status(401);
      throw new Error('Invalid credentials / अमान्य साख');
    }

    if (user.password === '' && password) {
      user.password = password;
      await user.save();
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      isFirstTimeUser: user.isFirstTimeUser,
      user: formatUserResponse(user),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendEmailOtp,
  verifyEmailOtp,
  loginOrVerify,
  loginRegister,
  registerUser,
  loginUser,
};

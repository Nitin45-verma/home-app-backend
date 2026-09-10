const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const Otp = require('../models/Otp');
const { sendVerificationEmail } = require('../utils/emailService');
const { sendOtpEmail } = require('../utils/sendEmail');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
  avatar: user.avatar,
  authProvider: user.authProvider,
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

/**
 * @desc    Authenticate with Google OAuth 2.0
 * @route   POST /api/auth/google
 * @access  Public
 *
 * IMPORTANT: GOOGLE_CLIENT_ID must be set in the .env file.
 * If GOOGLE_CLIENT_ID is undefined, verifyIdToken will always throw.
 *
 * The frontend sends: POST /api/auth/google  { idToken: "<google_id_token>" }
 */
const googleAuth = async (req, res, next) => {
  try {
    // Validate GOOGLE_CLIENT_ID is configured
    if (!process.env.GOOGLE_CLIENT_ID) {
      console.error('[googleAuth] GOOGLE_CLIENT_ID is not set in environment variables!');
      res.status(500);
      throw new Error('Server misconfiguration: GOOGLE_CLIENT_ID is missing');
    }

    const { idToken, credential } = req.body;
    // Accept both field names (idToken or credential) for flexibility
    const googleToken = idToken || credential;

    if (!googleToken) {
      res.status(400);
      throw new Error('Google ID token is required / Google ID टोकन आवश्यक है');
    }

    // Verify the Google ID token
    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: googleToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (verifyError) {
      console.error('[googleAuth] Token verification failed:', verifyError.message);
      res.status(400);
      throw new Error(`Invalid or expired Google token: ${verifyError.message}`);
    }

    if (!payload) {
      res.status(400);
      throw new Error('Could not extract payload from Google token');
    }

    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      res.status(400);
      throw new Error('Google account does not have a verified email address');
    }

    // Find existing user by googleId or email, create if new
    let user = await User.findOne({ $or: [{ googleId }, { emailPhone: email }] });

    if (!user) {
      const generatedUserId = uuidv4();
      user = await User.create({
        userId: generatedUserId,
        name: name || 'User',
        emailPhone: email,
        googleId,
        avatar: picture || '',
        authProvider: 'google',
        isEmailVerified: true,
        isFirstTimeUser: true,
      });
      console.log(`[googleAuth] New Google user created: ${email}`);
    } else {
      let isUpdated = false;
      if (!user.googleId) { user.googleId = googleId; isUpdated = true; }
      if (!user.avatar && picture) { user.avatar = picture; isUpdated = true; }
      if (user.authProvider !== 'google') { user.authProvider = 'google'; isUpdated = true; }
      if (!user.isEmailVerified) { user.isEmailVerified = true; isUpdated = true; }
      if (isUpdated) await user.save();
      console.log(`[googleAuth] Existing user logged in via Google: ${email}`);
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      token,
      isFirstTimeUser: user.isFirstTimeUser,
      user: formatUserResponse(user),
    });
  } catch (error) {
    // Status code is already set by the inner blocks above (400 or 500).
    // If somehow it got to here with 200 still set, default to 500 (server error).
    if (!res.headersSent) {
      const currentStatus = res.statusCode;
      if (!currentStatus || currentStatus === 200) {
        res.status(500);
      }
    }
    console.error('[googleAuth] Error:', error.message);
    next(error);
  }
};

/**
 * @desc    Request Registration with OTP
 * @route   POST /api/auth/register-request
 * @access  Public
 */
const registerRequest = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      res.status(400);
      throw new Error('Please enter name, email, and password');
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ emailPhone: cleanEmail });
    if (existingUser && existingUser.isEmailVerified) {
      res.status(400);
      throw new Error('User already exists with this email');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Upsert OTP record
    await Otp.findOneAndUpdate(
      { email: cleanEmail },
      { email: cleanEmail, otp, userData: { name, password } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Send email
    await sendOtpEmail(cleanEmail, otp);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully to your email'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify Registration OTP and Create User
 * @route   POST /api/auth/verify-register-otp
 * @access  Public
 */
const verifyRegisterOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400);
      throw new Error('Email and OTP are required');
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find OTP record
    const otpRecord = await Otp.findOne({ email: cleanEmail });
    if (!otpRecord) {
      res.status(400);
      throw new Error('Invalid or expired OTP');
    }

    if (otpRecord.otp !== otp) {
      res.status(400);
      throw new Error('Invalid OTP');
    }

    // Create permanent user
    const generatedUserId = uuidv4();
    const newUser = await User.create({
      userId: generatedUserId,
      name: otpRecord.userData.name,
      emailPhone: cleanEmail,
      password: otpRecord.userData.password,
      isEmailVerified: true,
      isFirstTimeUser: true,
    });

    // Delete OTP record
    await Otp.deleteOne({ email: cleanEmail });

    const token = generateToken(newUser._id);

    res.status(201).json({
      success: true,
      token,
      isFirstTimeUser: newUser.isFirstTimeUser,
      user: formatUserResponse(newUser),
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
  googleAuth,
  registerRequest,
  verifyRegisterOtp,
};

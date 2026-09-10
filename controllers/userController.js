const User = require('../models/User');
const bcrypt = require('bcryptjs');

/**
 * @desc    Collect first-time user data and complete onboarding
 * @route   PUT /api/user/onboard
 * @access  Private
 */
const onboardUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const { name, monthlyBudget, preferredLanguage, savingsName, savingsTarget, savingsAchieved } = req.body;

    user.name = name !== undefined ? name : user.name;
    user.monthlyBudget = monthlyBudget !== undefined ? Number(monthlyBudget) : user.monthlyBudget;
    user.preferredLanguage = preferredLanguage !== undefined ? preferredLanguage : user.preferredLanguage;
    user.isFirstTimeUser = false; // Toggle to false

    // Optionally onboard savings parameters too
    if (savingsName !== undefined) user.savingsName = savingsName;
    if (savingsTarget !== undefined) user.savingsTarget = Number(savingsTarget);
    if (savingsAchieved !== undefined) user.savingsAchieved = Number(savingsAchieved);

    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      message: 'Onboarding completed successfully',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/user/profile
 * @access  Private
 */
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile & preferences
 * @route   PUT /api/user/profile
 * @access  Private
 */
const updateUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const {
      name,
      monthlyBudget,
      preferredLanguage,
      savingsName,
      savingsTarget,
      savingsAchieved,
      avatar
    } = req.body;

    user.name = name !== undefined ? name.trim() : user.name;
    user.monthlyBudget = monthlyBudget !== undefined ? Number(monthlyBudget) : user.monthlyBudget;
    user.preferredLanguage = preferredLanguage !== undefined ? preferredLanguage : user.preferredLanguage;
    if (avatar !== undefined) user.avatar = avatar;
    
    // Savings parameters
    user.savingsName = savingsName !== undefined ? savingsName : user.savingsName;
    user.savingsTarget = savingsTarget !== undefined ? Number(savingsTarget) : user.savingsTarget;
    user.savingsAchieved = savingsAchieved !== undefined ? Number(savingsAchieved) : user.savingsAchieved;

    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Onboarding completion endpoint
 * @route   PUT /api/user/complete-onboarding
 * @access  Private
 */
const completeOnboarding = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const { name, monthlyBudget, preferredLanguage } = req.body;

    user.name = name !== undefined ? name : user.name;
    user.monthlyBudget = monthlyBudget !== undefined ? Number(monthlyBudget) : user.monthlyBudget;
    user.preferredLanguage = preferredLanguage !== undefined ? preferredLanguage : user.preferredLanguage;
    user.isFirstTimeUser = false; // strictly toggle to false

    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      message: 'Onboarding completed successfully / ऑनबोर्डिंग सफलतापूर्वक पूरी हुई',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Spin daily wheel to win points
 * @route   POST /api/user/spin-wheel
 * @access  Private
 */
const spinWheel = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const today = new Date();
    const lastSpin = user.lastSpinDate ? new Date(user.lastSpinDate) : null;

    if (lastSpin &&
        lastSpin.getDate() === today.getDate() &&
        lastSpin.getMonth() === today.getMonth() &&
        lastSpin.getFullYear() === today.getFullYear()) {
      return res.status(400).json({
        success: false,
        message: 'Already spun today! / आज का स्पिन पहले ही पूरा हो चुका है!'
      });
    }

    const wonPoints = Math.floor(Math.random() * 41) + 10;
    user.rewardPoints = (user.rewardPoints || 0) + wonPoints;
    user.lastSpinDate = today;

    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      message: 'Spin successful',
      wonPoints,
      rewardPoints: updatedUser.rewardPoints,
      lastSpinDate: updatedUser.lastSpinDate,
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change User Password
 * @route   PUT /api/user/change-password
 * @access  Private
 */
const changeUserPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (user.authProvider === 'google') {
      res.status(400);
      throw new Error('Google-authenticated accounts do not use a local password');
    }

    if (!currentPassword || !newPassword) {
      res.status(400);
      throw new Error('Please provide current and new password');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      res.status(401);
      throw new Error('Incorrect current password');
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  onboardUser,
  getUserProfile,
  updateUserProfile,
  completeOnboarding,
  spinWheel,
  changeUserPassword
};

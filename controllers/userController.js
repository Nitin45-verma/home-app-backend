const User = require('../models/User');

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
      savingsAchieved
    } = req.body;

    user.name = name !== undefined ? name : user.name;
    user.monthlyBudget = monthlyBudget !== undefined ? Number(monthlyBudget) : user.monthlyBudget;
    user.preferredLanguage = preferredLanguage !== undefined ? preferredLanguage : user.preferredLanguage;
    
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

module.exports = {
  onboardUser,
  getUserProfile,
  updateUserProfile,
  completeOnboarding,
  spinWheel
};

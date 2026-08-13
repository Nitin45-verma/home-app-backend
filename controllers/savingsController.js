const User = require('../models/User');
const Expense = require('../models/Expense');

/**
 * @desc    Subtract total spent from monthlyBudget, calculate leftover and update savingsGullakBalance
 * @route   GET /api/savings/gullak
 * @access  Private
 */
const getGullakBalance = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const monthlyBudget = user.monthlyBudget || 0;

    // Get current calendar month boundaries
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Sum debit expenses for the current month
    const expenseAggregate = await Expense.aggregate([
      {
        $match: {
          userId: userId,
          type: 'debit',
          date: {
            $gte: startOfMonth,
            $lte: endOfMonth
          }
        }
      },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: '$amount' }
        }
      }
    ]);

    const totalSpent = expenseAggregate.length > 0 ? expenseAggregate[0].totalSpent : 0;

    // Calculate leftover budget
    const leftover = monthlyBudget - totalSpent;
    const balance = leftover > 0 ? leftover : 0;

    // Update the user's virtual Gullak balance in DB
    user.savingsGullakBalance = balance;
    await user.save();

    res.status(200).json({
      success: true,
      monthlyBudget,
      totalSpent,
      leftover,
      savingsGullakBalance: balance
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getGullakBalance
};

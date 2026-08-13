const Expense = require('../models/Expense');

// Utility to escape regex characters
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * @desc    Compute total expenses grouped by category and percentages
 * @route   GET /api/analytics/category-breakdown
 * @access  Private
 */
const getCategoryBreakdown = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const breakdown = await Expense.aggregate([
      // Match only debit (expenses) for this user
      {
        $match: {
          userId: userId,
          type: 'debit'
        }
      },
      // Facet to calculate total sum in parallel with grouped category sums
      {
        $facet: {
          totalSpent: [
            {
              $group: {
                _id: null,
                total: { $sum: '$amount' }
              }
            }
          ],
          categories: [
            {
              $group: {
                _id: '$category',
                amount: { $sum: '$amount' }
              }
            }
          ]
        }
      },
      // Extract the total spent number and category list
      {
        $project: {
          totalSpent: { $arrayElemAt: ['$totalSpent.total', 0] },
          categories: '$categories'
        }
      },
      // Deconstruct the categories array
      {
        $unwind: {
          path: '$categories',
          preserveNullAndEmptyArrays: false
        }
      },
      // Project the category name, amount, and calculate percentage
      {
        $project: {
          _id: 0,
          category: '$categories._id',
          amount: '$categories.amount',
          percentage: {
            $cond: {
              if: { $gt: ['$totalSpent', 0] },
              then: {
                $round: [
                  {
                    $multiply: [
                      { $divide: ['$categories.amount', '$totalSpent'] },
                      100
                    ]
                  },
                  2
                ]
              },
              else: 0
            }
          }
        }
      },
      // Sort by amount descending
      {
        $sort: { amount: -1 }
      }
    ]);

    // Calculate total debit spent for convenience response
    const totalSpentResult = await Expense.aggregate([
      { $match: { userId, type: 'debit' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalSpent = totalSpentResult.length > 0 ? totalSpentResult[0].total : 0;

    res.status(200).json({
      success: true,
      totalSpent,
      breakdown
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get chronological monthly price history for a specific itemName
 * @route   GET /api/analytics/price-history
 * @access  Private
 */
const getItemPriceHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { itemName } = req.query;

    if (!itemName) {
      res.status(400);
      throw new Error('Please specify an itemName query parameter / कृपया itemName पैरामीटर निर्दिष्ट करें');
    }

    const escapedItemName = escapeRegExp(itemName.trim());

    const priceHistory = await Expense.aggregate([
      // Match user, specific item name (case-insensitive exact match) and type debit
      {
        $match: {
          userId: userId,
          itemName: { $regex: new RegExp(`^${escapedItemName}$`, 'i') },
          type: 'debit'
        }
      },
      // Group by year and month
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$date' }
          },
          averagePrice: { $avg: '$amount' },
          totalSpent: { $sum: '$amount' },
          count: { $sum: 1 },
          // Store actual entries for transparency
          purchases: {
            $push: {
              expenseId: '$expenseId',
              amount: '$amount',
              date: '$date',
              notes: '$notes'
            }
          }
        }
      },
      // Format output values
      {
        $project: {
          _id: 0,
          month: '$_id', // e.g. "2026-07"
          averagePrice: { $round: ['$averagePrice', 2] },
          totalSpent: { $round: ['$totalSpent', 2] },
          count: 1,
          purchases: 1
        }
      },
      // Sort chronologically by month
      {
        $sort: { month: 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      itemName: itemName.trim(),
      history: priceHistory
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategoryBreakdown,
  getItemPriceHistory
};

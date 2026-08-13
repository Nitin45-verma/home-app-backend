const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const Expense = require('../models/Expense');

/**
 * @desc    Create recurring monthly bill/reminder
 * @route   POST /api/reminders
 * @access  Private
 */
const addReminder = async (req, res, next) => {
  try {
    const { title, amount, dueDate, category } = req.body;

    if (!title || !amount || !dueDate) {
      res.status(400);
      throw new Error('Please provide title, amount, and dueDate / कृपया शीर्षक, राशि और देय तिथि प्रदान करें');
    }

    const user = await User.findById(req.user._id);

    const generatedReminderId = uuidv4();
    const newReminder = {
      reminderId: generatedReminderId,
      title,
      amount: Number(amount),
      category: category || 'Utilities',
      dueDate: new Date(dueDate),
      status: 'unpaid'
    };

    user.reminders.push(newReminder);
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Bill reminder added successfully',
      reminder: newReminder
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Fetch active unpaid bills for the current calendar month
 * @route   GET /api/reminders
 * @access  Private
 */
const getReminders = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Filter unpaid bills due in the current month
    const activeUnpaidReminders = user.reminders.filter(reminder => {
      const due = new Date(reminder.dueDate);
      const isUnpaid = reminder.status === 'unpaid';
      const isCurrentMonth = due.getFullYear() === currentYear && due.getMonth() === currentMonth;
      return isUnpaid && isCurrentMonth;
    });

    res.status(200).json({
      success: true,
      reminders: activeUnpaidReminders
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Log the bill as an expense and mark it paid
 * @route   PUT /api/reminders/:id/pay
 * @access  Private
 */
const payReminder = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const reminderId = req.params.id;

    // Find the reminder subdocument
    const reminder = user.reminders.find(r => r.reminderId === reminderId);

    if (!reminder) {
      res.status(404);
      throw new Error('Reminder not found / रिमाइंडर नहीं मिला');
    }

    if (reminder.status === 'paid') {
      res.status(400);
      throw new Error('Reminder is already paid / रिमाइंडर का भुगतान पहले ही किया जा चुका है');
    }

    // Mark as paid
    reminder.status = 'paid';
    await user.save();

    // Log it as an expense item in the Expense collection
    const generatedExpenseId = uuidv4();
    const loggedExpense = await Expense.create({
      expenseId: generatedExpenseId,
      userId: user._id,
      amount: reminder.amount,
      category: reminder.category,
      itemName: reminder.title,
      type: 'debit',
      date: new Date(),
      notes: `Paid bill reminder: ${reminder.title}`
    });

    res.status(200).json({
      success: true,
      message: 'Bill marked as paid and logged as expense',
      reminder,
      expense: loggedExpense
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addReminder,
  getReminders,
  payReminder
};

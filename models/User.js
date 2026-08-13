const mongoose = require('mongoose');

const ReminderSchema = new mongoose.Schema({
  reminderId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    default: 'Utilities'
  },
  dueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['paid', 'unpaid'],
    default: 'unpaid'
  }
}, {
  timestamps: true
});

const UserSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    default: ''
  },
  emailPhone: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  password: {
    type: String,
    default: ''
  },
  monthlyBudget: {
    type: Number,
    default: 0
  },
  preferredLanguage: {
    type: String,
    default: 'en'
  },
  isFirstTimeUser: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailOtp: {
    type: String,
    default: null
  },
  emailOtpExpires: {
    type: Date,
    default: null
  },

  // Savings Goal Fields to align with the Dashboard & Profile screens
  savingsName: {
    type: String,
    default: ''
  },
  savingsTarget: {
    type: Number,
    default: 0
  },
  savingsAchieved: {
    type: Number,
    default: 0
  },
  // Advanced features additions
  savingsGullakBalance: {
    type: Number,
    default: 0
  },
  reminders: {
    type: [ReminderSchema],
    default: []
  },
  rewardPoints: {
    type: Number,
    default: 0
  },
  lastSpinDate: {
    type: Date
  }
}, {
  timestamps: true // This will automatically add createdAt and updatedAt fields
});

module.exports = mongoose.model('User', UserSchema);

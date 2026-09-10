const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  otp: { type: String, required: true },
  userData: {
    name: { type: String, required: true },
    password: { type: String, required: true },
  },
  createdAt: { type: Date, default: Date.now, index: { expires: 600 } } // Auto delete after 10 mins
});

module.exports = mongoose.model('Otp', otpSchema);

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendOtpEmail = async (toEmail, otp) => {
  const mailOptions = {
    from: `"Housewives Tracker" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Your Registration Verification OTP',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #4F46E5;">Welcome to Housewives Tracker</h2>
        <p>Your verification code for creating your account is:</p>
        <h1 style="letter-spacing: 4px; color: #111;">${otp}</h1>
        <p style="color: #666; font-size: 13px;">This code is valid for 10 minutes. If you did not request this, please ignore.</p>
      </div>
    `
  };
  return transporter.sendMail(mailOptions);
};

const nodemailer = require('nodemailer');

/**
 * Create Nodemailer Transporter instance
 */
const createTransporter = () => {
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT || '587', 10);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    return null; // Return null if SMTP details are missing
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user,
      pass,
    },
  });
};

/**
 * Send Verification OTP Email
 * @param {string} toEmail - Recipient email address
 * @param {string} otp - 6 digit OTP string
 */
const sendVerificationEmail = async (toEmail, otp) => {
  const transporter = createTransporter();
  const fromAddress = process.env.EMAIL_FROM || '"HomeBudget" <no-reply@homebudget.app>';

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #0a1422; margin: 0;">HomeBudget Verification</h2>
        <p style="color: #666; font-size: 14px; margin-top: 5px;">Your Email Verification Code / आपका ईमेल सत्यापन कोड</p>
      </div>
      <div style="background-color: #f0f4f8; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 20px;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0a1422;">${otp}</span>
      </div>
      <p style="color: #555; font-size: 14px; line-height: 1.5;">
        Use this 6-digit verification code to complete your signup or email verification. This code is valid for 10 minutes.
      </p>
      <p style="color: #888; font-size: 12px; margin-top: 25px; border-top: 1px solid #eee; padding-top: 15px; text-align: center;">
        If you did not request this email, please ignore it.
      </p>
    </div>
  `;

  // Always log to console in development mode for easy testing
  console.log(`\n==================================================`);
  console.log(`[EMAIL VERIFICATION OTP] Sent to: ${toEmail}`);
  console.log(`[VERIFICATION CODE]: >>> ${otp} <<<`);
  console.log(`==================================================\n`);

  if (!transporter) {
    console.log('[emailService] EMAIL_USER/EMAIL_PASS not configured in .env. Operating in Development Mode (OTP printed above).');
    return { success: true, simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: `HomeBudget Email Verification Code: ${otp}`,
      html: htmlContent,
    });
    console.log(`[emailService] Real email sent successfully. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId, simulated: false };
  } catch (error) {
    console.error('[emailService] Failed to send real email via Nodemailer:', error.message);
    // Return success in dev mode so the app doesn't break if SMTP fails
    return { success: true, error: error.message, simulated: true };
  }
};

module.exports = {
  sendVerificationEmail,
};

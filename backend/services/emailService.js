/**
 * Email Service (Nodemailer with Gmail SMTP)
 * Sends transactional emails such as Password Reset OTP.
 * Configured via EMAIL_USER and EMAIL_APP_PASSWORD environment variables.
 */

const nodemailer = require('nodemailer');

/**
 * Generate clean, modern HTML template for password reset OTP email
 * @param {string} otp - 6-digit OTP
 */
const generateOtpEmailTemplate = (otp) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your ERP Portal Password Reset OTP</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e5e7eb;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); padding: 32px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">College ERP Portal</h1>
              <p style="margin: 8px 0 0 0; color: #e0e7ff; font-size: 14px;">Password Reset Verification</p>
            </td>
          </tr>
          
          <!-- Content Body -->
          <tr>
            <td style="padding: 32px 30px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 24px; color: #374151;">
                Hello,
              </p>
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 24px; color: #374151;">
                We received a request to reset the password for your College ERP account. Use the 6-digit One-Time Password (OTP) below to proceed with resetting your password:
              </p>
              
              <!-- OTP Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
                <tr>
                  <td align="center" style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 22px;">
                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #4338ca; display: inline-block;">
                      ${otp}
                    </span>
                  </td>
                </tr>
              </table>
              
              <!-- Security Notice -->
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 6px; padding: 14px 16px; margin: 24px 0;">
                <p style="margin: 0; font-size: 13px; line-height: 20px; color: #991b1b; font-weight: 600;">
                  ⏱ This OTP is valid for <strong>5 minutes</strong> only and can only be used once.
                </p>
                <p style="margin: 6px 0 0 0; font-size: 13px; line-height: 20px; color: #991b1b;">
                  🔒 For your security, never share this OTP with anyone. College staff will never ask for your OTP.
                </p>
              </div>

              <p style="margin: 24px 0 0 0; font-size: 13px; line-height: 20px; color: #6b7280;">
                If you did not request a password reset, please ignore this email or notify your system administrator immediately.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                &copy; ${new Date().getFullYear()} College ERP Management System. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

/**
 * Creates and returns a Nodemailer transporter configured for Gmail SMTP.
 */
const createTransporter = () => {
  const user = process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : '';
  const pass = process.env.EMAIL_APP_PASSWORD ? process.env.EMAIL_APP_PASSWORD.trim().replace(/\s+/g, '') : '';

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass
    }
  });
};

/**
 * Send Password Reset OTP Email
 * @param {string} email - Destination registered email
 * @param {string} otp - 6-digit numeric OTP string
 * @returns {Promise<{success: boolean, messageId?: string, error?: string, mocked?: boolean}>}
 */
const sendOtpEmail = async (email, otp) => {
  const user = process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : '';
  const pass = process.env.EMAIL_APP_PASSWORD ? process.env.EMAIL_APP_PASSWORD.trim().replace(/\s+/g, '') : '';

  console.log(`[Email Service] Dispatching OTP email to ${email} (Provider: ${user && pass ? 'Gmail SMTP' : 'Mock/Console'})`);

  if (!user || !pass) {
    // Development / Test mode fallback: Log clearly to console so flows can be tested without active Gmail credentials
    console.log(`=======================================================`);
    console.log(`📧 [MOCK EMAIL] OTP GENERATED FOR ${email}: ${otp}`);
    console.log(`Valid for 5 minutes.`);
    console.log(`Set EMAIL_USER and EMAIL_APP_PASSWORD in .env for live Gmail delivery.`);
    console.log(`=======================================================`);
    return { success: true, mocked: true, message: `OTP logged for ${email}` };
  }

  let transporter;
  try {
    transporter = createTransporter();
    if (!transporter) {
      throw new Error('Nodemailer transporter could not be initialized with provided credentials.');
    }
  } catch (err) {
    console.error('[Email Service Error]: Transporter initialization failed:', err.message);
    return { success: false, error: err.message };
  }

  const fromAddress = process.env.EMAIL_FROM || `"College ERP Portal" <${user}>`;

  const mailOptions = {
    from: fromAddress,
    to: email,
    subject: 'Your ERP Portal Password Reset OTP',
    text: `Your College ERP Portal password reset OTP is: ${otp}\n\nThis OTP is valid for 5 minutes only.\nDo not share this OTP with anyone.\n\nIf you did not request this, please ignore this email.`,
    html: generateOtpEmailTemplate(otp)
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Service] OTP email delivered to ${email}. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[Email Service Error]: Failed to send OTP email:', err.message);
    return { success: false, error: err.message };
  }
};

module.exports = {
  sendOtpEmail,
  generateOtpEmailTemplate,
  createTransporter
};

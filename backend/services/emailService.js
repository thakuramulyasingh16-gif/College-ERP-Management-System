/**
 * Email Service (Nodemailer with Gmail SMTP)
 * Sends transactional emails such as Password Reset OTP.
 * Configured via EMAIL_USER and EMAIL_APP_PASSWORD environment variables.
 * Uses a pooled singleton transporter on port 465 (secure direct TLS) with fast timeouts.
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

// Singleton Transporter & Config Tracking
let cachedTransporter = null;
let lastUser = null;
let lastPass = null;

/**
 * Returns a singleton Nodemailer transporter with connection pooling and timeouts.
 * Recreates only if credentials have changed.
 */
const getTransporter = () => {
  const user = process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : '';
  // Strip all whitespace from 16-character Google App Password (e.g. 'abcd efgh ijkl mnop' -> 'abcdefghijklmnop')
  const pass = process.env.EMAIL_APP_PASSWORD 
    ? process.env.EMAIL_APP_PASSWORD.trim().replace(/\s+/g, '') 
    : '';

  if (!user || !pass) {
    cachedTransporter = null;
    return null;
  }

  // Reuse existing transporter if credentials haven't changed
  if (cachedTransporter && user === lastUser && pass === lastPass) {
    return cachedTransporter;
  }

  lastUser = user;
  lastPass = pass;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE !== 'false'; // true for port 465

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    connectionTimeout: 10000, // 10s connection establishment timeout
    greetingTimeout: 10000,   // 10s greeting timeout
    socketTimeout: 10000,     // 10s socket inactivity timeout
    auth: {
      user,
      pass
    }
  });

  return cachedTransporter;
};

// Eagerly initialize singleton transporter on module load if credentials are in process.env
if (process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD) {
  try {
    getTransporter();
  } catch (_e) {
    // Will retry lazily on first sendOtpEmail call
  }
}

/**
 * Send Password Reset OTP Email
 * @param {string} email - Destination registered email
 * @param {string} otp - 6-digit numeric OTP string
 * @returns {Promise<{success: boolean, messageId?: string, error?: string, mocked?: boolean, durationMs?: number, code?: string}>}
 */
const sendOtpEmail = async (email, otp) => {
  const user = process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : '';
  const pass = process.env.EMAIL_APP_PASSWORD 
    ? process.env.EMAIL_APP_PASSWORD.trim().replace(/\s+/g, '') 
    : '';

  if (!user || !pass) {
    // Development / Test mode fallback: Log clearly to console
    console.log(`[Email Service] Dispatching OTP email to ${email} (Provider: Mock/Console)`);
    console.log(`=======================================================`);
    console.log(`📧 [MOCK EMAIL] OTP GENERATED FOR ${email}: ${otp}`);
    console.log(`Valid for 5 minutes.`);
    console.log(`Set EMAIL_USER and EMAIL_APP_PASSWORD in .env / Render for live Gmail delivery.`);
    console.log(`=======================================================`);
    return { success: true, mocked: true, message: `OTP logged for ${email}` };
  }

  console.log(`[Email Service] Dispatching OTP email to ${email} (Provider: Gmail SMTP smtp.gmail.com:465 pooled)`);

  let transporter;
  try {
    transporter = getTransporter();
    if (!transporter) {
      throw new Error('Nodemailer transporter could not be initialized with provided credentials.');
    }
  } catch (err) {
    console.error('[Email Service Error]: Transporter initialization failed:');
    console.error({
      message: err.message,
      code: err.code,
      stack: err.stack
    });
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

  const startTime = Date.now();
  try {
    // Race sendMail with a 12-second timeout so requests fail fast if network stalls
    const sendMailPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) => {
      const timer = setTimeout(() => {
        const timeoutErr = new Error('SMTP sendMail timed out after 12 seconds');
        timeoutErr.code = 'ETIMEDOUT';
        reject(timeoutErr);
      }, 12000);
      if (timer.unref) timer.unref();
    });

    const info = await Promise.race([sendMailPromise, timeoutPromise]);
    const durationMs = Date.now() - startTime;
    console.log(`[Email Service] OTP email delivered to ${email} in ${durationMs}ms. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId, durationMs };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    console.error(`[Email Service Error]: Failed to send OTP email to ${email} (took ${durationMs}ms):`);
    console.error({
      message: err.message,
      code: err.code,
      command: err.command,
      response: err.response,
      responseCode: err.responseCode,
      stack: err.stack
    });
    return { success: false, error: err.message, code: err.code };
  }
};

module.exports = {
  sendOtpEmail,
  generateOtpEmailTemplate,
  getTransporter,
  createTransporter: getTransporter,
  resetTransporterForTesting: () => { cachedTransporter = null; lastUser = null; lastPass = null; }
};

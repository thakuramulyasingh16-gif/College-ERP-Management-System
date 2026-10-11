/**
 * Email Service (Resend HTTP API)
 * Sends transactional emails such as Password Reset OTP via Resend HTTPS API.
 * Uses port 443 (HTTPS), which works reliably across all cloud providers including Render Free Tier.
 */

const { Resend } = require('resend');

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

// Resend Singleton Client
let cachedResend = null;
let lastApiKey = null;

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.trim() : '';
  if (!apiKey) return null;
  if (cachedResend && apiKey === lastApiKey) {
    return cachedResend;
  }
  lastApiKey = apiKey;
  cachedResend = new Resend(apiKey);
  return cachedResend;
};

/**
 * Send Password Reset OTP Email using Resend HTTP API (over port 443 HTTPS).
 * @param {string} email - Destination registered email
 * @param {string} otp - 6-digit numeric OTP string
 * @returns {Promise<{success: boolean, messageId?: string, error?: string, mocked?: boolean, durationMs?: number}>}
 */
const sendOtpEmail = async (email, otp) => {
  const apiKey = process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.trim() : '';

  // If no RESEND_API_KEY is configured:
  if (!apiKey) {
    if (process.env.NODE_ENV === 'production' && !process.env.MOCK_EMAIL_FOR_TESTS) {
      console.error('[Email Service Error]: RESEND_API_KEY environment variable is missing on this server.');
      console.error('Please configure RESEND_API_KEY in the Render Dashboard (Environment Variables tab).');
      return { success: false, error: 'RESEND_API_KEY is not configured' };
    }

    // Development / Local Test mode fallback
    console.log(`[Email Service] Dispatching OTP email to ${email} (Provider: Mock/Console)`);
    console.log(`=======================================================`);
    console.log(`📧 [MOCK EMAIL] OTP GENERATED FOR ${email}: ${otp}`);
    console.log(`Valid for 5 minutes.`);
    console.log(`Set RESEND_API_KEY in .env / Render for live email delivery via Resend API.`);
    console.log(`=======================================================`);
    return { success: true, mocked: true, message: `OTP logged for ${email}` };
  }

  console.log(`[Email Service] Dispatching OTP email to ${email} (Provider: Resend HTTPS API)`);

  const startTime = Date.now();
  try {
    const resend = getResendClient();
    const fromAddress = process.env.RESEND_FROM || 'ERP Portal <onboarding@resend.dev>';

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: 'Your ERP Portal Password Reset OTP',
      text: `Your College ERP Portal password reset OTP is: ${otp}\n\nThis OTP is valid for 5 minutes only.\nDo not share this OTP with anyone.\n\nIf you did not request this, please ignore this email.`,
      html: generateOtpEmailTemplate(otp)
    });

    if (error) {
      console.error('[Email Service Error - Resend API]: Failed to send OTP email:');
      console.error({
        message: error.message,
        name: error.name
      });
      return { success: false, error: error.message };
    }

    const durationMs = Date.now() - startTime;
    console.log(`[Email Service - Resend API] OTP email successfully sent to ${email} in ${durationMs}ms. Message ID: ${data?.id}`);
    return { success: true, messageId: data?.id, durationMs };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    console.error(`[Email Service Error - Resend API]: Exception during send (took ${durationMs}ms):`);
    console.error({
      message: err.message,
      stack: err.stack
    });
    return { success: false, error: err.message };
  }
};

/*
 * NOTE / REFERENCE:
 * Gmail SMTP (Nodemailer) was deprecated and removed because Render's free tier
 * blocks outbound SMTP ports (25, 465, 587) at the firewall level.
 * Resend sends transactional email via HTTPS (Port 443), which works reliably
 * on Render free tier.
 */

module.exports = {
  sendOtpEmail,
  generateOtpEmailTemplate,
  getResendClient,
  resetClientForTesting: () => {
    cachedResend = null;
    lastApiKey = null;
  }
};

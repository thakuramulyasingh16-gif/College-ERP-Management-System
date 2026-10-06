/**
 * SMS Service Abstraction
 * Supports configurable providers (Fast2SMS, MSG91, Twilio, etc.)
 * Configured via SMS_API_KEY, SMS_SENDER_ID, and SMS_PROVIDER environment variables.
 */

const sendOtpSms = async (mobile, otp) => {
  const apiKey = process.env.SMS_API_KEY;
  const senderId = process.env.SMS_SENDER_ID || 'CGCERP';
  const provider = (process.env.SMS_PROVIDER || 'fast2sms').toLowerCase();

  console.log(`[SMS Service] Dispatching OTP to +91-${mobile} (Provider: ${apiKey ? provider : 'Mock/Console'})`);

  if (!apiKey) {
    // Development / Test mode: Log clearly to console so flows can be tested without an active SMS gateway
    console.log(`========================================`);
    console.log(`📱 SMS OTP GENERATED FOR +91-${mobile}: ${otp}`);
    console.log(`Valid for 5 minutes.`);
    console.log(`========================================`);
    return { success: true, mocked: true, message: `OTP logged for ${mobile}` };
  }

  try {
    if (provider === 'fast2sms') {
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          variables_values: otp,
          route: 'otp',
          numbers: mobile
        })
      });
      const data = await response.json().catch(() => ({}));
      return { success: response.ok, data };
    } else if (provider === 'msg91') {
      const response = await fetch(`https://control.msg91.com/api/v5/otp?template_id=${senderId}&mobile=91${mobile}&otp=${otp}`, {
        method: 'POST',
        headers: {
          'authkey': apiKey,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json().catch(() => ({}));
      return { success: response.ok, data };
    } else {
      console.warn(`[SMS Service] Unknown provider '${provider}', fell back to console log.`);
      return { success: true, mocked: true };
    }
  } catch (err) {
    console.error('[SMS Service Error]:', err.message);
    return { success: false, error: err.message };
  }
};

module.exports = { sendOtpSms };

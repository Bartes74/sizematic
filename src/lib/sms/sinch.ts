/**
 * Sinch SMS verification integration
 * https://developers.sinch.com/docs/sms/api-reference/
 */

const SINCH_SERVICE_PLAN_ID = process.env.SINCH_SERVICE_PLAN_ID;
const SINCH_API_TOKEN = process.env.SINCH_API_TOKEN;
const SINCH_SMS_ENDPOINT = 'https://us.sms.api.sinch.com/xms/v1';

export type SMSResponse = {
  success: boolean;
  message_id?: string;
  error?: string;
};

/**
 * Send SMS verification code via Sinch
 */
export async function sendSMSCode(
  phoneNumber: string,
  code: string
): Promise<SMSResponse> {
  if (!SINCH_SERVICE_PLAN_ID || !SINCH_API_TOKEN) {
    console.error('Sinch credentials not configured');
    return {
      success: false,
      error: 'SMS service not configured',
    };
  }

  try {
    const message = `Twój kod weryfikacyjny GiftFit: ${code}. Kod wygasa za 10 minut.`;

    const response = await fetch(
      `${SINCH_SMS_ENDPOINT}/${SINCH_SERVICE_PLAN_ID}/batches`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SINCH_API_TOKEN}`,
        },
        body: JSON.stringify({
          from: 'GiftFit',
          to: [phoneNumber],
          body: message,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Sinch SMS API error:', error);
      return {
        success: false,
        error: `Failed to send SMS: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      message_id: data.id,
    };
  } catch (error) {
    console.error('Error sending SMS via Sinch:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate a 6-digit verification code
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Normalize phone number to E.164 format
 * Simple implementation - may need enhancement for production
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If it starts with +, keep it
  if (phone.startsWith('+')) {
    return '+' + digits;
  }
  
  // If it's Polish number without country code (starts with 0 or has 9 digits)
  if (digits.startsWith('0') || digits.length === 9) {
    const localNumber = digits.startsWith('0') ? digits.slice(1) : digits;
    return '+48' + localNumber;
  }
  
  // Otherwise assume it already has country code
  return '+' + digits;
}


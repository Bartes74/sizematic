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
    console.error('SINCH_SERVICE_PLAN_ID:', SINCH_SERVICE_PLAN_ID ? 'SET' : 'MISSING');
    console.error('SINCH_API_TOKEN:', SINCH_API_TOKEN ? 'SET' : 'MISSING');
    return {
      success: false,
      error: 'Konfiguracja SMS jest niepełna. Skontaktuj się z administratorem.',
    };
  }

  try {
    const message = `Twój kod weryfikacyjny GiftFit: ${code}. Kod wygasa za 10 minut.`;
    
    console.log('Sending SMS to:', phoneNumber);
    console.log('Sinch endpoint:', `${SINCH_SMS_ENDPOINT}/${SINCH_SERVICE_PLAN_ID}/batches`);

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
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch {
        errorDetails = await response.text();
      }
      
      console.error('Sinch SMS API error response:', {
        status: response.status,
        statusText: response.statusText,
        details: errorDetails,
      });
      
      // Return user-friendly error message
      let userMessage = 'Nie udało się wysłać SMS. ';
      if (response.status === 400) {
        userMessage += 'Nieprawidłowy numer telefonu. Upewnij się, że format jest poprawny (np. +48 123 456 789).';
      } else if (response.status === 401) {
        userMessage += 'Problem z autoryzacją SMS. Skontaktuj się z administratorem.';
      } else if (response.status === 403) {
        userMessage += 'Brak uprawnień do wysyłania SMS. Skontaktuj się z administratorem.';
      } else {
        userMessage += 'Spróbuj ponownie za chwilę.';
      }
      
      return {
        success: false,
        error: userMessage,
      };
    }

    const data = await response.json();
    console.log('SMS sent successfully:', data.id);
    
    return {
      success: true,
      message_id: data.id,
    };
  } catch (error) {
    console.error('Error sending SMS via Sinch:', error);
    return {
      success: false,
      error: 'Wystąpił nieoczekiwany błąd podczas wysyłania SMS. Spróbuj ponownie.',
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


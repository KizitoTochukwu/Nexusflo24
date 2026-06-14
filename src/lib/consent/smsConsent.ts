/**
 * Centralized SMS consent disclosure for Twilio A2P 10DLC compliance.
 * The exact text below is what the visitor sees next to the checkbox and what
 * we persist into `sms_consent_text` so we can prove what was shown at capture.
 */
export const SMS_CONSENT_TEXT =
  "I agree to receive email, WhatsApp, and/or SMS messages from NexusFlo24 regarding my enquiry, demo booking, account updates, appointment reminders, and service notifications. Reply STOP to opt out or HELP for help. Consent is not a condition of purchase. View our Privacy Policy and Terms.";

export interface SmsConsentPayload {
  sms_consent: boolean;
  sms_consent_text: string;
  sms_consent_timestamp: string; // ISO
  sms_consent_source: string;
  sms_opt_out: false;
}

export function buildSmsConsentPayload(
  agreed: boolean,
  source: string,
): SmsConsentPayload {
  return {
    sms_consent: !!agreed,
    sms_consent_text: SMS_CONSENT_TEXT,
    sms_consent_timestamp: new Date().toISOString(),
    sms_consent_source: source,
    sms_opt_out: false,
  };
}

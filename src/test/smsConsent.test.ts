import { describe, expect, it } from "vitest";
import {
  buildSmsConsentText,
  DEFAULT_SMS_CONSENT_PURPOSE,
  SMS_CONSENT_REQUIRED_TEXT,
} from "@/lib/consent/smsConsent";

describe("form messaging consent", () => {
  it("uses the existing purpose when a form has no custom wording", () => {
    expect(buildSmsConsentText()).toBe(`${DEFAULT_SMS_CONSENT_PURPOSE} ${SMS_CONSENT_REQUIRED_TEXT}`);
  });

  it("keeps required compliance wording after a custom purpose", () => {
    expect(buildSmsConsentText("I agree to receive updates about this webinar.")).toBe(
      `I agree to receive updates about this webinar. ${SMS_CONSENT_REQUIRED_TEXT}`,
    );
  });

  it("does not allow blank custom wording to remove the default purpose", () => {
    expect(buildSmsConsentText("   ")).toContain(DEFAULT_SMS_CONSENT_PURPOSE);
  });
});
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SMS_CONSENT_TEXT } from "@/lib/consent/smsConsent";

interface Props {
  id?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  className?: string;
  consentText?: string;
}

/**
 * Twilio A2P 10DLC compliant SMS opt-in checkbox.
 * The displayed copy must match SMS_CONSENT_TEXT exactly — that string is what
 * gets persisted as `sms_consent_text` for proof-of-consent.
 */
export default function SmsConsentCheckbox({ id = "sms-consent", checked, onCheckedChange, className, consentText = SMS_CONSENT_TEXT }: Props) {
  // Split the canonical text so we can render Privacy Policy / Terms as real links
  // without changing the copy that gets stored.
  const parts = consentText.split("View our Privacy Policy and Terms.");
  const lead = parts[0];

  return (
    <div className={`flex items-start gap-2.5 ${className || ""}`}>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        className="mt-0.5"
      />
      <Label
        htmlFor={id}
        className="text-xs text-muted-foreground leading-relaxed font-normal cursor-pointer"
      >
        {lead}
        View our{" "}
        <Link to="/privacy-policy" className="underline hover:text-accent">
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link to="/terms-of-service" className="underline hover:text-accent">
          Terms
        </Link>
        .
      </Label>
    </div>
  );
}

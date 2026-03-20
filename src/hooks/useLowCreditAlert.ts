import { useEffect, useRef } from "react";
import { useMessageCredits } from "./useMessageCredits";
import { toast } from "sonner";

const LOW_THRESHOLD = 20;
const CHANNELS = [
  { key: "email_balance" as const, label: "Email" },
  { key: "sms_balance" as const, label: "SMS" },
  { key: "whatsapp_balance" as const, label: "WhatsApp" },
];

/**
 * Shows a toast warning when any channel's credits drop below a threshold.
 * Only fires once per channel per session to avoid spamming.
 */
export function useLowCreditAlert() {
  const { data: credits } = useMessageCredits();
  const alerted = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!credits) return;

    for (const ch of CHANNELS) {
      const balance = (credits[ch.key] as number) ?? 0;
      if (balance > 0 && balance <= LOW_THRESHOLD && !alerted.current.has(ch.key)) {
        alerted.current.add(ch.key);
        toast.warning(`Low ${ch.label} credits`, {
          description: `Only ${balance} ${ch.label.toLowerCase()} credits remaining. Top up in Settings → Usage.`,
          duration: 8000,
        });
      }
    }
  }, [credits]);
}

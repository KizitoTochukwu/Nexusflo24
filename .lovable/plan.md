
## Diagnosis

From the edge logs, the actual pipeline is correct:
- `whatsapp-send` correctly detects the workspace provider (`twilio`) and forwards to `twilio-whatsapp-send`.
- `twilio-whatsapp-send` calls Twilio's `Messages.json` with `From`/`To` wrapped as `whatsapp:+…`.
- Twilio itself is returning **HTTP 400, code 20422: "Region capability is not available for this message"**.

So the message *is* going out as WhatsApp — the UI just made it look like SMS because of two things:

1. **UI bug (cosmetic, misleading):** `AutomationEmailEditor.tsx` unconditionally shows `"{n} chars · {n} SMS segments"` for both SMS *and* WhatsApp steps. That's the "still using SMS logic" symptom — it is *only* a label; the send path is already WhatsApp.
2. **Provider error surfaced as-is:** the Twilio 20422 comes back verbatim. Code 20422 with that message means the WhatsApp sender in use (workspace `from_number`/`messaging_service_sid`, or the platform default `TWILIO_FROM_NUMBER_1` / `MESSAGING_SERVICE_SID` fallback) is not approved by Twilio/Meta to send WhatsApp traffic to the destination country (UK/+44). Twilio Geo Permissions are an SMS-only setting and do not fix this — WhatsApp region capability is per-sender on Twilio's Senders console. We cannot silently work around this server-side; we must show a clear, actionable error.

No routing bug, no SMS payload leaking into the WA send, and `From`/`To` are already `whatsapp:+…`.

## Fix plan

### 1. `src/components/automations/email-editor/AutomationEmailEditor.tsx`
- Make the character/segment counter channel-aware:
  - `resolvedChannel === "sms"` → `"{n} chars · {segments} SMS segment(s)"` (unchanged).
  - `resolvedChannel === "whatsapp"` → `"{n} characters"` only. No SMS segment math shown.
  - Email path unchanged.
- Extend WhatsApp `sendTest` error handling with a new branch for `reason === "region_capability"`, surfacing a friendly toast such as:
  > "Twilio: the WhatsApp sender isn't approved to send to this country. Open Twilio Console → Messaging → Senders and enable the destination region for your WhatsApp sender, or pick a WhatsApp‑enabled sender in Settings → Channels."
- Also update the raw error mapping so any toast that contains `20422` or `"Region capability"` shows the same friendly message with the underlying Twilio text appended in parentheses.

### 2. `supabase/functions/twilio-whatsapp-send/index.ts`
- After Twilio returns non-OK, in addition to the existing `63016` handling, detect region-capability errors:
  - `code === 20422` **or** `/Region capability/i.test(errMsg)` → return `200` with `{ success:false, provider:"twilio", reason:"region_capability", code, error }`.
- Add a log line before the send with the resolved routing: `provider="twilio"`, `usingMessagingService`, redacted `From` (last 4 digits) or `MG…` SID prefix, and `To`. This makes future "is this actually WhatsApp?" questions answerable from logs.
- Keep the existing `From = whatsapp:+…` / `MessagingServiceSid` selection as-is (already correct — the log line just confirms it).

### 3. No changes to
- `whatsapp-send` routing (correct — logs show it forwards to Twilio based on provider).
- `channel-credentials` / provider switch UI.
- Meta path.
- Credit logic.

## Verification
1. Trigger Send test on a WhatsApp automation → toast should read the friendly region-capability message (not "Edge Function returned a non-2xx status code", not raw Twilio JSON).
2. Editor toolbar for a WhatsApp step should read "310 characters" — no "SMS segments".
3. SMS step still shows "chars · N SMS segments".
4. Edge logs for `twilio-whatsapp-send` should now include the resolved routing line so we can confirm the outbound is truly `whatsapp:+…`.
5. No regression on Meta-provider workspaces (unchanged code path).

## Note to user
The underlying Twilio 20422 is a **sender approval / region capability** issue, not a Geo Permission issue and not a code bug. Once the surfaced error is clear, the fix on Twilio's side is to enable the destination country for your WhatsApp sender in Twilio Console → Messaging → Senders, or configure a Messaging Service that includes a WhatsApp sender approved for that region, then save it in Settings → Channels → WhatsApp (Twilio).

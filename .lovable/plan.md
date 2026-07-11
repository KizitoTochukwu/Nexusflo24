## Root cause

Logs show your workspace has WhatsApp provider `twilio`, so the automation editor's **Send test** calls `whatsapp-send`, which forwards to `twilio-whatsapp-send`. That forwarded call currently returns a non-2xx status when Twilio credentials are incomplete (e.g. no `from_number`) or the WA 24h window is closed, and `whatsapp-send` preserves that status code. The Supabase JS client then surfaces the generic `Edge Function returned a non-2xx status code` and the real backend reason never reaches the UI.

Additional gaps:
- `resolveChannelCredentials` returns the workspace Twilio row as soon as one field is present, so **platform default** Twilio env vars (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER_1`, `MESSAGING_SERVICE_SID`) are never merged in as a fallback.
- `twilio-whatsapp-send` has no `preview` prefix / friendly 24h-window handling, and doesn't accept `MG…` messaging service SIDs cleanly as `From`.
- The frontend `sendTest` in `AutomationEmailEditor.tsx` doesn't read `FunctionsHttpError.context`, so even when the backend returns JSON with `error`, the toast shows the generic Supabase message.

## Fix plan

### 1. `supabase/functions/whatsapp-send/index.ts` — provider forwarder
- After forwarding to `twilio-whatsapp-send`, always return **HTTP 200** to the caller carrying `{ success, error, provider:"twilio", …fwdData }`. Non-2xx from the child becomes `success:false` at the parent, so the client can read the real message instead of a bare 4xx/5xx.
- Log the forwarded status and error body for debugging.

### 2. `supabase/functions/twilio-whatsapp-send/index.ts` — resilient sender
- Resolve credentials in this order per field: workspace row → platform env fallback → error. Merge per-field instead of "row wins entirely".
- Accept either a phone number (`from_number`) or a Messaging Service SID (`MG…` in `messaging_service_sid` / `MESSAGING_SERVICE_SID` env) as `From`. Only wrap phone numbers with `whatsapp:`; pass `MG…` SIDs as `MessagingServiceSid` param.
- Validate recipient with existing `normalizePhoneE164`; on invalid, return `{success:false,error:"…"}` with 200.
- On 24h-window/`63016` error, return 200 with `{success:false, fallback:true, reason:"window_closed", error}` (already there — just make sure preview sends go the same way).
- In `preview` mode: prefix `[TEST]` (already there), skip credits, and on any provider error return 200 with the Twilio error body so the UI can display it. Auth/permission errors (20003/20404) still trigger `notifyCredentialFailure`.
- Return a clear "Twilio WhatsApp not configured. Add Account SID + Auth Token + a WhatsApp-enabled From number (or Messaging Service SID) in Settings → Channels, or set platform env defaults." message when nothing resolves.

### 3. `supabase/functions/_shared/channel-credentials.ts` — per-field fallback
- Extend `resolveChannelCredentials` so callers can pass a `mergePlatformDefaults: true` option (or just: for any key present in `platformFallback` but missing/empty in the workspace config, fill from platform). Keep current behavior for callers that don't opt in. `twilio-whatsapp-send` and `whatsapp-send` (Meta path) will opt in.

### 4. `src/components/automations/email-editor/AutomationEmailEditor.tsx` — real error surfacing
- In the WhatsApp branch of `sendTest`, when `supabase.functions.invoke` returns an error, detect `FunctionsHttpError` and `await error.context.text()`, JSON-parse it, and surface `body.error` in the toast. Same for the SMS/email branches for parity.
- Keep existing `data.success === false` handling as the primary path (it now works because step 1 returns 200).

### 5. Verification
- Deploy `whatsapp-send`, `twilio-whatsapp-send`.
- Test cases from the editor's Send test popover:
  1. Workspace on Twilio with valid creds + open 24h window → success toast.
  2. Workspace on Twilio, closed window → toast shows "WhatsApp 24h window closed…" (not generic non-2xx).
  3. Workspace on Twilio with missing `from_number` but platform `TWILIO_FROM_NUMBER_1` set → succeeds via platform default.
  4. Workspace on Twilio with no creds anywhere → toast shows the "not configured" message.
  5. Workspace on Meta (unchanged path) → still works, hello_world preview fallback still fires when needed.

## Scope guardrails
- No schema changes, no new tables, no changes to Meta connection flow, templates, or webhooks.
- No changes to `WhatsAppConnectCard` provider-switch UI.
- Credit deduction rules unchanged (preview still skips credits).

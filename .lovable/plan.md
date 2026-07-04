## Root cause

The WhatsApp "Send test" call fails at the edge function, not in the UI. Diagnosis:

1. The recipient's 24h window is closed, so `whatsapp-send` auto-switches to the workspace's default re-engagement template (`reengagement_followup_v1`).
2. That template is stored in our DB as language **`en`** (from the last sync), and we send it to Meta as `en`.
3. Meta rejects it with **`(#132001) Template name does not exist in the translation`** — Meta's copy of the approved template is registered under a different language tag (typically `en_US` or `en_GB`).
4. `whatsapp-send` returns HTTP 400 → the browser shows "Edge Function returned a non-2xx status code".

Confirmed via `whatsapp_messages` logs — every recent send to this workspace failed with the same 132001 error, for both the test message and previous welcome messages.

## Fix

Make template sending resilient to Meta's language-code mismatch so a user's test (and real automations/campaigns) don't fail whenever the stored language tag drifts from Meta's registered tag.

### 1. `supabase/functions/whatsapp-send/index.ts` — auto-retry on 132001

- After the initial `sendWhatsAppMessage(...)` call, if `attempt.ok === false` **and** we were sending a template **and** the Graph error code is `132001`, retry with a small set of alternate language tags derived from the current one:
  - `en` → try `en_US`, then `en_GB`
  - `en_US` / `en_GB` → try `en`
  - Any `xx_YY` → try the base `xx`
  - Any `xx` → try `xx_US` (generic fallback)
- Deduplicate and skip the language we already tried. Stop at the first success.
- On the first successful retry, also update `whatsapp_templates.language` for that workspace+name so future sends use the correct tag immediately (no need to re-sync).
- If every retry still fails, return the original 132001 error message unchanged, but append a shorter hint: `"Auto-retried alternate language tags — none matched. Re-sync templates from Meta."`

### 2. `supabase/functions/whatsapp-sync-templates/index.ts` — safer default when Meta returns bare `en`

- When Meta returns `language: "en"` for a template, also mark it "language_variants_possible" via a note in logs (no schema change). This is informational only; the send-side retry above is the actual fix.

### 3. UI — surface a clearer message for this specific failure

- `AutomationEmailEditor.tsx` test-send catch block: when `data.graphSubcode === 132001` (or error text contains `132001`), replace the raw error with:
  > "WhatsApp template language mismatch — we tried alternate tags automatically. Please re-sync templates in Settings → Channels → WhatsApp."

No schema changes, no new secrets, no changes to the 24h-window flow itself.

## Technical notes

- `whatsapp-send` already returns `graphCode`/`graphSubcode` in the JSON body; the retry stays inside the same function so the caller contract is unchanged.
- The DB self-heal (`update whatsapp_templates set language = <working>`) is scoped to `workspace_id + name` and only runs on a confirmed successful send, so a transient Meta hiccup can't corrupt the row.
- Existing 24h-window logic, credit deduction, `preview`/`[TEST]` prefixing, and Twilio dispatch remain untouched.

## Out of scope

- No changes to Twilio path, hello_world flow, or credit accounting.
- No new Settings UI — the existing "Sync templates from Meta" button in Settings → Channels remains the manual recovery path.

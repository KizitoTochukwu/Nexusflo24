## Problem

Variables like `{{first_name}}`, `{{last_name}}`, `{{email}}`, `{{phone}}`, `{{company}}`, `{{lead_score}}`, `{{booking_link}}`, etc. are advertised throughout the editors (email, SMS, WhatsApp) via `editorConstants.ts`, but most of them are **never substituted** at send time. The screenshot confirms this: a real SMS arrived containing the literal text `Hi {{first_name}},` instead of the lead's first name.

### Root causes

1. **Test sends never interpolate.** `AutomationEmailEditor.sendTest` and `ChannelSettingsTab` send the raw editor body straight to `email-send` / `sms-send` / `whatsapp-send`. The send functions do not perform any variable replacement, so `{{first_name}}` goes out verbatim. (This is exactly what produced the SMS in the screenshot.)
2. **Real campaigns only handle two variables.** `execute-campaign/index.ts` only replaces `{{first_name}}` and `{{full_name}}` — every other advertised token (`{{last_name}}`, `{{email}}`, `{{phone}}`, `{{company}}`, `{{source}}`, `{{lead_score}}`, `{{lead_status}}`, `{{booking_link}}`, `{{funnel_link}}`, `{{offer_page_link}}`, `{{webinar_link}}`, `{{last_activity_date}}`, `{{assigned_rep}}`, `{{checkout_link}}`, `{{next_step_link}}`, `{{external_url}}`) ships unrendered.
3. **Automations interpolate a subset.** `execute-automation/interpolate()` covers 6 variables (first_name, full_name, email, phone, source, status). It misses last_name, company, lead_score, lead_status, last_activity_date, assigned_rep, and all the smart links.
4. **No graceful fallback.** When a value is missing, tokens like `{{first_name}}` ship as literal text rather than being replaced with a sensible fallback (e.g. "there" / empty string).
5. **Inconsistent variable name handling.** Editors document `{{first_name}}` but leads table only has `full_name` — so first/last name need to be derived. There's no shared utility, leading to drift.

## Solution

Build one shared, exhaustive interpolation helper used everywhere a message body / subject is rendered, and call it on the test-send paths too.

### 1. New shared util: `supabase/functions/_shared/interpolate-vars.ts`

Single source of truth. Exports:

- `buildLeadVars(lead, workspace, opts)` → returns a `Record<string, string>` mapping every documented token to its resolved value, deriving:
  - `first_name` / `last_name` from `full_name` (split on first space; fallback `"there"` for first_name when missing)
  - `company` from `lead.company` (fallback empty)
  - `lead_score`, `lead_status`, `source`, `email`, `phone`
  - `last_activity_date` (formatted from `lead.updated_at` or latest activity)
  - `assigned_rep` from workspace member name if `lead.assigned_to`
  - Smart links: `booking_link`, `funnel_link`, `offer_page_link`, `webinar_link`, `checkout_link`, `next_step_link`, `external_url` — resolved from workspace defaults or passed-in `opts.links`
- `interpolateText(template, vars)` → replaces all `{{token}}` (case-insensitive, tolerant of whitespace `{{ first_name }}`) with values; **leaves unknown tokens replaced with empty string** (no more raw `{{...}}` reaching recipients).
- `previewVars()` → demo values used when no lead context exists (test sends).

### 2. Wire it everywhere a message is sent

**`execute-campaign/index.ts`**
- Replace lines 141–143 with `buildLeadVars(lead, workspace) → interpolateText(subject, vars)` / `interpolateText(body, vars)`.

**`execute-automation/index.ts`**
- Delete the local `interpolate()` (lines 11–19) and import the shared helper. Use it for `subject`, body, and the `notify_sales` title/message.

**`execute-workflow/index.ts`** — apply same pattern (it also has its own placeholder logic per earlier search).

**Test sends** (this is what fixes the screenshot):
- `AutomationEmailEditor.sendTest` (`src/components/automations/email-editor/AutomationEmailEditor.tsx`): before invoking `email-send`/`sms-send`/`whatsapp-send`, run `interpolateText` client-side using `previewVars()` (or, optionally, the logged-in user's profile) so test messages render real values like `Hi John,` instead of `Hi {{first_name}},`.
- `ChannelSettingsTab` test buttons: same treatment.
- Add a tiny client helper at `src/lib/messaging/interpolate.ts` mirroring the edge function logic so test-sends don't need a round-trip.

### 3. Defense-in-depth at the send functions

Add a final `interpolateText(text, previewVars())` pass inside `email-send`, `sms-send`, and `whatsapp-send` for any leftover `{{...}}` tokens when no lead context was provided. This guarantees no recipient ever sees a raw `{{token}}` again, even if a future caller forgets to interpolate.

### 4. Editor UX polish (small)

- Add a “Preview with sample data” toggle in `AutomationEmailEditor` test popover so users see exactly how variables will render before clicking Send Test.
- Surface a small inline hint under the body field: “Variables like `{{first_name}}` are auto-filled per recipient. Test sends use sample data.”

## Files to change

```
NEW    supabase/functions/_shared/interpolate-vars.ts
NEW    src/lib/messaging/interpolate.ts
EDIT   supabase/functions/execute-campaign/index.ts
EDIT   supabase/functions/execute-automation/index.ts
EDIT   supabase/functions/execute-workflow/index.ts
EDIT   supabase/functions/email-send/index.ts
EDIT   supabase/functions/sms-send/index.ts
EDIT   supabase/functions/whatsapp-send/index.ts
EDIT   src/components/automations/email-editor/AutomationEmailEditor.tsx
EDIT   src/components/settings/ChannelSettingsTab.tsx
```

## Outcome

- Every token documented in `editorConstants.ts` resolves correctly across email, SMS, and WhatsApp — both real campaign/automation sends and editor test sends.
- The exact bug in the screenshot (literal `{{first_name}}` arriving by SMS) disappears: test sends substitute sample values, real sends substitute the lead's real values.
- Unknown / missing variables degrade gracefully (empty string or sensible fallback), never as raw `{{...}}`.
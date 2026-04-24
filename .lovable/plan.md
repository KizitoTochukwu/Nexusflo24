# Fix: WhatsApp & SMS messages sent as raw HTML

## What's broken

The screenshot shows the WhatsApp message arriving as literal HTML:

```
<div style="text-align: justify; ">Hey {{FirstName}}, it's Kizito.</div><div ...><br></div>...
```

WhatsApp (and SMS) don't render HTML — they show it as text.

## Root cause

`AutomationStepEditor` uses the same `AutomationEmailEditor` component for **all three** message actions: `send_email`, `send_whatsapp`, and `send_sms`. That editor is a `contentEditable` rich-text surface that stores `el.innerHTML` (so every line break becomes `<div>...<br></div>`, and every formatting/link tap injects more HTML).

The execution path then sends that HTML as-is:
- `execute-automation` → forwards `config.message` straight to `whatsapp-send` / Twilio.
- `execute-campaign` → same issue with `content.body`.
- Neither path strips HTML for WhatsApp/SMS.

Email works fine because email is HTML-native; WhatsApp/SMS are plain-text channels.

## Fix (two layers — both needed)

### 1. UI: use a plain-text editor for WhatsApp & SMS

In `src/components/automations/AutomationStepEditor.tsx` (line 325–335) and `src/components/automations/email-editor/AutomationEmailEditor.tsx`:

- Add a `mode: "email" | "plain"` prop to `AutomationEmailEditor` (or branch in the parent).
- For WhatsApp/SMS render a `<Textarea>` with:
  - Plain-text storage (no HTML).
  - The existing **Insert variable** dropdown ({{first_name}} etc.) inserting at cursor.
  - A character counter (SMS hint at 160 chars; WhatsApp shows length only).
  - Optional simple WhatsApp formatting hint chip (`*bold*`, `_italic_`, `~strike~`, ``` ``code`` ```).
- For Email, keep the current rich-text editor untouched.
- Apply the same mode switch in the **Campaign** create/edit dialog (`src/components/campaigns/CreateCampaignDialog.tsx`) so new campaigns also store plain text for SMS/WhatsApp.

### 2. Server safety net: strip HTML before sending

Even with the UI fix, **legacy steps already saved as HTML** (like the one in the screenshot) must be cleaned up at send time, otherwise existing automations keep misfiring.

Add a small `htmlToPlainText()` helper in `supabase/functions/_shared/` that:
- Decodes common entities (`&nbsp;`, `&amp;`, `&lt;`, `&gt;`, `&#39;`, `&quot;`).
- Converts `<br>`, `</p>`, `</div>`, `</li>` to `\n`.
- Converts `<a href="URL">text</a>` to `text (URL)` — or just `URL` when text equals URL (matches the screenshot case).
- Strips all remaining tags.
- Collapses 3+ newlines to 2 and trims.

Call it in:
- `supabase/functions/execute-automation/index.ts` — for `send_sms` (line 322) and `send_whatsapp` (line 328) bodies.
- `supabase/functions/execute-campaign/index.ts` — for the WhatsApp (line 177) and SMS (line 193) branches.
- `supabase/functions/whatsapp-send/index.ts` — defensive pass on `msgBody` (covers any other caller).
- `supabase/functions/sms-send/index.ts` — same defensive pass.

This guarantees that:
- New steps created after the fix are already plain text (no-op on the helper).
- Old/legacy steps with stored HTML get cleaned at send time.

## Out of scope

- No DB migration to rewrite historical step configs — the server-side stripper handles them on the fly, which is safer and reversible.
- Email editor and email rendering are unchanged.
- AI-Sales-Closer / inbox replies already send plain text — no change needed.

## Files to change

- `src/components/automations/email-editor/AutomationEmailEditor.tsx` — add plain-text mode.
- `src/components/automations/AutomationStepEditor.tsx` — pass mode based on action.
- `src/components/campaigns/CreateCampaignDialog.tsx` — same mode switch for campaign body.
- `supabase/functions/_shared/htmlToPlainText.ts` — new helper.
- `supabase/functions/execute-automation/index.ts` — strip for SMS/WhatsApp.
- `supabase/functions/execute-campaign/index.ts` — strip for SMS/WhatsApp.
- `supabase/functions/whatsapp-send/index.ts` — defensive strip.
- `supabase/functions/sms-send/index.ts` — defensive strip.

## Result

The same automation step that sent the broken WhatsApp message will, after the fix, deliver:

```
Hey Kizito, it's Kizito.

You downloaded the AI Sales Blueprint — nice move. Now I'll show you how to use it.

I'm hosting a LIVE training on May 3rd to show how to turn it into a working system that generates sales automatically.

This is where most people get stuck.

Save your seat here: https://nas.com/nexusflo24/events/ai-sales-system-...

Don't miss this.
```

— with no further action required from you on existing automations.

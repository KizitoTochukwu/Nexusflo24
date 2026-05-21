## Goal

Send an instant admin notification (Email always, WhatsApp + SMS optional) every time someone submits the `/contact` form — independent of CRM scoring/hot-lead logic.

## Approach

Reuse the existing `notify-form-submission` Edge Function pattern (already wired for the Forms module) instead of creating a new function. It already:
- Sends a branded email via Resend
- Calls `sms-send` and `whatsapp-send` for phone alerts
- Falls back to workspace owner/admin recipients
- Handles CORS + service-role auth

We'll invoke it from the Contact page right after `capture()` succeeds, using a synthetic `form_id` for the contact page, with hard-coded recipients (admin email + admin phone) plus channel toggles.

## Changes

### 1. `src/pages/Contact.tsx`
After the existing `await capture(...)` call, fire a second non-blocking invoke:
```ts
supabase.functions.invoke("notify-form-submission", {
  body: {
    form_id: "contact-page",            // synthetic id
    workspace_id: PUBLIC_ADMIN_WS_ID,   // your main workspace
    values: { name, email, phone, company, message, subject },
    lead_email: form.email,
    lead_name: form.name,
  },
});
```
Wrap in `try/catch` — never block the user-facing success state if notification fails.

### 2. `supabase/functions/notify-form-submission/index.ts`
Small tweak: the function currently 404s if no row exists in `forms` table. Add a branch:
- If `form_id === "contact-page"` (or form lookup misses), skip the DB lookup and use a built-in "Contact Page" pseudo-form with:
  - `name: "Contact Page"`
  - `settings.notify_channels: { email: true, sms: false, whatsapp: true }` (defaults; can be overridden via request body)
  - `settings.notify_emails: ["admin@nexusflo24.com"]`
  - `settings.notify_phones: ["+44 7517 327597"]`
- Allow the caller to pass `notify_channels`, `notify_emails`, `notify_phones` directly in the body to override.

This keeps one notification function for both modules and avoids a brittle DB row.

### 3. Recipient configuration
Hard-code defaults in the edge function for the contact page (admin email + WhatsApp number already shown on the Contact page itself):
- Email: `admin@nexusflo24.com`
- WhatsApp: `+44 7517 327597`
- SMS: off by default (Twilio costs); can be enabled by passing `notify_channels.sms: true`

### 4. No DB migration required
No new tables, no `forms` row needed. Channels (Resend, WhatsApp, Twilio) are already configured via existing secrets.

## What the admin will receive

**Email** (branded, navy/gold, same template as form notifications):
- Subject: `📝 New submission on "Contact Page" from {name}`
- Body: labelled table of Name, Email, Phone, Company, Message, Subject tag
- CTA button → workspace CRM

**WhatsApp** (text):
```
New submission on "Contact Page" from {name}

Name: ...
Email: ...
Phone: ...
Company: ...
Message: ...
```
Sent via existing `whatsapp-send` (falls back gracefully if 24h window closed per project rule).

**SMS** (only if explicitly enabled): same body, truncated.

## What does NOT change
- `capture-lead` flow, lead scoring, hot-lead alerts, CRM entry — all untouched
- Contact page UI — no visual changes
- Existing Forms module notifications — unaffected

## Files touched
- `src/pages/Contact.tsx` — add fire-and-forget invoke after capture
- `supabase/functions/notify-form-submission/index.ts` — add contact-page pseudo-form branch + body-level recipient overrides

## Open questions
1. Confirm admin email = `admin@nexusflo24.com` and WhatsApp = `+44 7517 327597` as defaults?
2. SMS off by default OK, or also on?
3. Want me to also CC the workspace owner's email automatically, or only the hard-coded admin email?

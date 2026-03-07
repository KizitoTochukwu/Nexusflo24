

## Plan: Consistent Branded Sender Identity for All Outbound Emails

### What Changes

Update both email-sending edge functions and upload the new logo to the email-assets storage bucket so all outbound emails use a unified sender profile.

### 1. Upload New Logo

Copy the uploaded logo to `public/` then upload to the `email-assets` storage bucket as `nexusflo24-logo-profile.png`. This will be used in email templates alongside the existing logo.

### 2. Update `supabase/functions/email-send/index.ts`

- Add `reply_to` to the `sendResend` function signature and Resend API payload
- Set default reply-to: `NexusFlo24 Support <support@nexusflo24.com>`
- Ensure `from` uses `NexusFlo24 <{EMAIL_FROM}>`

```typescript
async function sendResend(apiKey: string, from: string, to: string, subject: string, html: string, replyTo?: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html, reply_to: replyTo }),
  });
  // ...
}
```

Call it with: `sendResend(apiKey, from, to, subject, trackedHtml, "NexusFlo24 Support <support@nexusflo24.com>")`

### 3. Update `supabase/functions/execute-automation/index.ts`

Same changes to the `sendResend` helper:
- Add `replyTo` parameter
- Pass `reply_to` in the Resend payload
- Default reply-to on the `send_email` action call

### 4. Update Auth Email Templates (6 files)

Replace the current 48x48 logo with the new profile logo at a larger size (e.g., 56x56) in all templates:
- `signup.tsx`, `recovery.tsx`, `magic-link.tsx`, `invite.tsx`, `email-change.tsx`, `reauthentication.tsx`

Update the `Img` src to point to the new uploaded logo in the `email-assets` bucket.

### 5. Redeploy Edge Functions

Deploy `email-send`, `execute-automation`, and `auth-email-hook` to pick up changes.

### Scope
- 2 edge functions modified (`email-send`, `execute-automation`)
- 6 auth email templates updated (logo swap)
- 1 asset uploaded to storage
- No database changes


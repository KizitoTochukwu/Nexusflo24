## What I found

I traced the campaign **"Webinar – AI Sales System Masterclass – 3hrs Message"** (id `a41f0495…`) end-to-end.

### 1. Why the email shows "Failed"

- Recipient: `Kizzyadichie@gmail.com` (lead `675df493…`)
- `campaign_messages` row: `channel=email`, `delivery_status=failed`, created `2026-04-28 16:54:43`.
- **No row was written to `email_logs`** for this send — `email-send` only logs on success, so when Resend returns an error (or credentials/from address fail), the failure leaves no audit trail. The exact error text was returned to `execute-campaign` in `data.error` but **never persisted anywhere** (the `campaign_messages` table has no `error`/`error_message` column).
- Edge function logs for `email-send` around 16:54 only show boot/shutdown — the actual error string was thrown away.
- Most likely root causes (in order of probability based on the data):
  1. **Resend rate-limit / per-recipient cooldown** — `Kizzyadichie@gmail.com` has received 1 prior send, and earlier the same minute the editor likely sent a test. Resend frequently returns `429` or `422 "rate_limited"`.
  2. **From-address rejection** — workspace has no `workspace_channel_credentials` table, so it falls back to ENV `EMAIL_FROM`; if Resend's verified domain ≠ that address, every send returns `403`.
  3. **Recipient on Resend suppression list** (bounce/complaint from the Apr 23/24 sends).

We can't tell which **without persisting the error** — that's fix #2 below.

### 2. Why SMS / WhatsApp never attempted delivery

This is **not** a bug in the send code — the fallback **was** scheduled correctly. I found it in `scheduled_jobs`:

```
id:          0ddb2946-66c6-4737-b3cc-f089d85c2e68
type:        campaign_fallback
channel:     sms
run_at:      2026-04-28 17:24:43  (30 min after the email failed, exactly per fallback config)
status:      pending   ← never picked up
```

Then I read `supabase/functions/process-scheduled-jobs/index.ts` (lines 80–96):

```ts
const isWorkflow = !!(payload.workflow_id && payload.enrollment_id);
const targetUrl  = isWorkflow ? execute-workflow : execute-automation;
```

**The processor only knows about `workflow` and `automation` payloads. It has no branch for `payload.type === "campaign_fallback"`.** So the SMS fallback job sits in `pending` forever — it would either be skipped or, if the cron picks it up, sent to `execute-automation` with no `automation_id`, fail, and be marked `failed`. Looking at the row, `status` is still `pending` — meaning the cron hasn't run, *or* the lock fails because there's nothing meaningful to do.

That's why the contact never received SMS or WhatsApp: **the fallback dispatcher for campaign_fallback jobs doesn't exist.**

Bonus observation: the fallback in the campaign was configured as `sms` only (`fallback_settings.channel = "sms"`). WhatsApp was never going to be tried regardless — the campaign only has one fallback channel.

---

## Fix plan

### A. Make `process-scheduled-jobs` actually handle `campaign_fallback`

In `supabase/functions/process-scheduled-jobs/index.ts`, before the existing `isWorkflow` branch, add:

```ts
if (payload.type === "campaign_fallback") {
  const fbChannel = payload.channel; // "sms" | "whatsapp" | "email"
  const fbUrl =
    fbChannel === "sms"      ? `${supabaseUrl}/functions/v1/sms-send` :
    fbChannel === "whatsapp" ? `${supabaseUrl}/functions/v1/whatsapp-send` :
                               `${supabaseUrl}/functions/v1/email-send`;

  // Re-fetch the lead so we have the right phone/email at run time
  const { data: lead } = await supabase
    .from("leads").select("email, phone, full_name")
    .eq("id", payload.lead_id).single();

  const to = fbChannel === "email" ? lead?.email : lead?.phone;
  if (!to) { mark job failed with "No contact for fallback channel"; continue; }

  const fbBody = fbChannel === "email"
    ? { workspaceId: payload.workspace_id, to, subject: payload.subject, html: payload.body,
        leadId: payload.lead_id, campaignId: payload.campaign_id }
    : fbChannel === "whatsapp"
      ? { workspaceId: payload.workspace_id, to, body: payload.body,
          leadId: payload.lead_id, campaignId: payload.campaign_id }
      : { workspaceId: payload.workspace_id, to, message: payload.body };

  // POST, then mark job completed/failed AND insert a campaign_messages row
  // for the fallback channel so the drawer's Delivery Log shows it.
}
```

Also write a `campaign_messages` row for the fallback attempt (channel = `sms`/`whatsapp`, status `delivered` or `failed`) so the Campaign Details drawer shows the second attempt instead of just the failed Email row.

### B. Persist the actual send error so we can see *why* a send failed

Two small changes:

1. **`campaign_messages`** — add a nullable `error` text column via migration, and write `sendError` into it from `execute-campaign/index.ts` (line 211). The Campaign Details drawer can then show the real error next to the "Failed" badge instead of users having to guess.
2. **`email-send/index.ts`** — also insert into `email_logs` on failure (`status: "failed"`, `error: err.message`), not only on success. Right now the failure path returns 500 and the `try { … insert email_logs }` block is only reached when the send succeeds.

### C. Surface the failure reason in the Campaign Details drawer

In `src/components/campaigns/CampaignDetailsDrawer.tsx`, the Delivery Log section already lists `campaign_messages` rows. Add the new `error` column underneath the "Failed" badge in red text (e.g., `Resend error: rate_limited (429)`) so the user immediately knows whether it's a Resend issue, a from-address issue, or a missing phone number — without needing me to dig in the DB.

### D. Manual one-time recovery for THIS campaign

After the fix is deployed, I'll re-trigger the stuck job so this lead actually gets the SMS:

```sql
UPDATE scheduled_jobs
SET status = 'pending', run_at = now()
WHERE id = '0ddb2946-66c6-4737-b3cc-f089d85c2e68';
```

Then call `process-scheduled-jobs` once, and the SMS will go out within seconds.

---

## Files to change

```
EDIT     supabase/functions/process-scheduled-jobs/index.ts   (add campaign_fallback branch)
EDIT     supabase/functions/execute-campaign/index.ts          (write error into campaign_messages)
EDIT     supabase/functions/email-send/index.ts                (log failures to email_logs)
EDIT     src/components/campaigns/CampaignDetailsDrawer.tsx    (show error text under Failed badge)
NEW      supabase migration                                    (campaign_messages.error TEXT)
```

## Outcome

- The exact error text for any failed send is visible in the Campaign Details drawer (no more guessing).
- When the primary channel fails, the configured SMS/WhatsApp fallback **actually executes** at the scheduled time and shows up as a second row in the Delivery Log.
- The stuck job for this campaign gets re-run so the lead receives the SMS he was supposed to get at 17:24.

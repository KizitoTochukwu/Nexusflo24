## Goal

Verify end-to-end that the Campaigns page can send **Email + WhatsApp + SMS** from the browser without the "Failed to send a request to the Edge Function" error, using a single test lead: **kizzyadichie@gmail.com**.

## What I'll do (build-mode steps)

### 1. Prep — read-only checks

- `supabase--read_query` to find the lead: `SELECT id, workspace_id, email, phone, tags FROM public.leads WHERE lower(email) = 'kizzyadichie@gmail.com' LIMIT 1`.
- Fail fast with a clear message if there's no phone number on the lead (WA/SMS cannot deliver otherwise); ask you for a phone if missing.
- Confirm the workspace has `whatsapp_settings`, `sms_settings`, and either an approved sender / Resend key for Email (SELECT-only sanity check on presence, no secret values printed).
- Redeploy `execute-campaign`, `execute-automation`, `execute-workflow` so the auth-guard fix is live.

### 2. Create a throwaway multi-channel test campaign

Insert a single row via `supabase--insert` into `public.campaigns`:

- `name`: `E2E send test — {timestamp}`
- `workspace_id`: from step 1
- `type`: `multi` (per the multi-channel schema)
- `campaign_type` / `mode`: `broadcast`
- `status`: `draft`
- `audience_filter`: `{ "lead_ids": ["<test lead id>"] }`
- `message_content`: plain-text bodies scoped to each channel:
  - Email: subject `NexusFlo24 delivery test`, body `Test send at {ts} — please ignore.`
  - WhatsApp: same short text (no template — will exercise 24h-window handling / fallback wiring)
  - SMS: `NexusFlo24 test {ts} — ignore.`
- `fallback_settings`: `{ enabled: true, channel: "sms", delay_minutes: 0 }` so a closed WA window falls back to SMS.
- `schedule_type`: `now`.

### 3. Fire it as the browser would

Call the deployed function directly using the **currently logged-in preview user's JWT** (that's you, workspace owner). This mirrors what the Campaigns page does after the "Send Campaign Now" click:

```
supabase--curl_edge_functions
  path=/execute-campaign, method=POST
  body={"campaign_id":"<id>"}
```

Read the JSON response — expect `{ sent, failed, results:[…] }` and **no 403 / "Failed to send a request"**.

### 4. Read back the actual delivery evidence

For each channel, confirm a row exists and its status:

- Email: `email_send_log` where `recipient_email = 'kizzyadichie@gmail.com'` and `created_at >= now() - interval '5 min'` (dedup by `message_id`, latest per email).
- WhatsApp: `whatsapp_messages` for the lead in the last 5 min (`status`, `error_message`).
- SMS: `sms_logs` for the lead in the last 5 min.
- Cross-check with `campaign_messages` rows for the new campaign.

### 5. Tail edge function logs for anything red

`supabase--edge_function_logs` for `execute-campaign`, `whatsapp-send`, `send-transactional-email` (or the SMS sender name in use). Report any errors verbatim.

### 6. Report per-channel result

Answer your question with a small table:

| Channel   | Fn responded 2xx | Provider accepted | Notes |
|-----------|-----------------:|------------------:|-------|
| Email     |                  |                   |       |
| WhatsApp  |                  |                   |       |
| SMS       |                  |                   |       |

Plus an explicit yes/no on: *did any call return "Failed to send a request to the Edge Function"?*

### 7. Cleanup

Leave the throwaway campaign in place (marked `sent`/`completed` by the function) so you can inspect the run in the UI. If you want it removed I'll delete it in a follow-up.

## Notes / expectations

- If WhatsApp is outside the 24h window and there's no approved template, the memory rule + earlier audit require `whatsapp-send` to return `success:false, fallback:true` and the caller flips to SMS. That path will show up in the results as WA=failed(fallback) + SMS=sent, which still counts as delivered and is the correct behavior — I'll call that out explicitly instead of marking WA a regression.
- No provider credentials, service-role key, or JWTs will be echoed back to you.

## Out of scope

- No UI changes.
- No changes to provider adapters, credit accounting, WA template config, or fallback logic — only observation.

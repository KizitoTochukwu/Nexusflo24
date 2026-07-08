## Why nothing was delivered for campaign "hi"

Looking at the actual data for campaign `4c8aca54…` (type = `multi-channel`, target = lead `kizzyadichie@gmail.com`):

- `campaigns.sent_count = 0`, `status = completed`
- `campaign_messages` for this campaign: **0 rows** — no send was ever attempted
- Target lead's `tags` contains **`unsubscribed`**
- `message_content.body` is a **block-JSON array** from the email/funnel builder (`[{id, type:"text", props:{content:...}}, {type:"image",...}, ...]`), not a rendered HTML/text string
- `type = "multi-channel"` but nothing in the code actually fans out to all three channels

So three independent bugs stack on top of each other. Even if you fix one, the next still blocks delivery.

### Root causes

1. **Silent unsubscribe skip.** `execute-campaign` filters out any lead whose `tags` include `unsubscribed`, then if the filtered list is empty it writes `sent_count:0, status:completed` and returns `"All matching leads are unsubscribed"` — with **no row in `campaign_messages`, no toast, no notification**. From the UI it looks like the campaign ran successfully and delivered nothing, with no explanation.

2. **`multi-channel` only sends email.** In `execute-campaign/index.ts` the send loop does:
   ```
   const effectiveChannel = channel === "multi-channel" ? "email" : channel;
   ```
   So a "multi-channel" campaign only ever calls `email-send`. WhatsApp and SMS are **never dispatched** as primary channels. The `fallback_settings` (SMS after 30min if unread) also can't help here because fallback only fires when the primary send *fails* — a skipped/unsubscribed lead never even reaches that branch.

3. **Body is block-JSON, not renderable content.** The campaign editor saved `body` as the funnel-builder block array. `execute-campaign` passes that raw JSON string straight into:
   - `email-send` as `html` → recipient would see a wall of `[{"id":"blk_…"}]`
   - `whatsapp-send` / `sms-send` as message body → same raw JSON, and WA/SMS have strict length + content rules so many providers will reject it outright.
   There's no block-array → HTML (for email) or → plain-text (for WA/SMS) renderer on the send path.

### Fix plan

Frontend + edge function changes only. No schema changes.

**A. Actually send on all requested channels for `type = "multi-channel"`**

In `supabase/functions/execute-campaign/index.ts`:

- Replace the single `effectiveChannel` branch with a loop over the channels the campaign requested. Derive the channel set from `message_content.channels` (already written by `CreateCampaignDialog` for multi-channel) with fallback to `["email","whatsapp","sms"]` when absent.
- For each channel present, call the matching send function *if the lead has the required contact field* (`email` for email, `phone` for wa/sms).
- Insert one `campaign_messages` row per channel per lead with its own `delivery_status` + `error`.
- Keep the existing fallback scheduler, but only trigger it when **all** primary channels for a lead failed (not per-channel), so we don't stack duplicate SMS fallbacks.

**B. Render block-JSON body before sending**

Add a shared helper `supabase/functions/_shared/render-blocks.ts`:

- `renderBlocksToHtml(body)` — walks the block array, emits `<p>`, `<img>`, `<a>`, `<h1..h3>`, list, divider, button blocks into safe HTML, honouring `props.fontSize/color/alignment/fontWeight/lineHeight/src/alt/width`.
- `renderBlocksToText(body)` — same walk, produces newline-separated plain text (used for WA + SMS). Images become `[image: alt]` or their `linkUrl`, buttons become `label: url`.
- `coerceBody(raw)` — if `raw` parses as a block array, run the appropriate renderer; otherwise pass through unchanged (back-compat with existing plain-text/HTML campaigns).

`execute-campaign` calls `coerceBody(messageBody, "html")` for the email leg and `coerceBody(messageBody, "text")` for WA + SMS legs, *before* interpolating variables (so `{{first_name}}` still works inside block text content).

**C. Stop silently swallowing "everyone was unsubscribed"**

In `execute-campaign`:

- Track counts of `skipped_unsubscribed`, `skipped_missing_contact`, `skipped_no_channel_match`, and return them in the response JSON.
- When the whole audience is filtered out, still update `sent_count:0` but set `status = "failed"` (not `"completed"`) and write a workspace notification: `"Campaign 'hi' sent to 0 recipients — 1 lead skipped (unsubscribed)"` so the operator sees the real reason.

In `CreateCampaignDialog` / `CampaignDetailsDrawer`:

- Surface the returned `skipped_*` counts in a toast after send ("Campaign sent to 0 of 1 — 1 unsubscribed").
- In the details drawer, add a "Skipped recipients" panel listing skipped counts by reason so the user isn't left staring at an empty timeline.

**D. Verification for this specific case**

After deploying the changes, re-run against `kizzyadichie@gmail.com` following the previous test protocol:
1. Remove the `unsubscribed` tag on the lead.
2. Trigger the campaign via `execute-campaign` with `campaign_id = 4c8aca54…`.
3. Confirm three `campaign_messages` rows appear (email, whatsapp, sms), each with a delivered/failed status coming from the real provider (not from the block-JSON blob).
4. Restore the `unsubscribed` tag; re-trigger; confirm the campaign now surfaces the "1 skipped (unsubscribed)" reason in the toast + drawer instead of silently completing.

### Files touched

- `supabase/functions/execute-campaign/index.ts` — multi-channel fan-out, skip counters, notification on 0-send
- `supabase/functions/_shared/render-blocks.ts` — new shared renderer
- `src/components/campaigns/CreateCampaignDialog.tsx` — surface skipped counts in the success toast
- `src/components/campaigns/CampaignDetailsDrawer.tsx` — add "Skipped recipients" panel

No DB migrations, no new secrets, no provider config changes required.

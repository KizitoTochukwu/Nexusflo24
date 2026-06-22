## Confirmation: WhatsApp auto-reply is NOT firing

I checked your workspace data directly. Here's what's actually happening:

**What's configured correctly**
- AI Sales Closer is **enabled**, mode = **auto_send**, channels include **whatsapp** ✅
- WhatsApp account is connected (1 row in `whatsapp_accounts`) ✅
- Inbound WhatsApp messages **are** being received by the webhook — 68 total in `whatsapp_messages` (latest May 30 2026) ✅

**What's broken**
1. **AI Sales Closer is not being triggered by inbound WA messages.** The last 6+ inbound WhatsApp messages (May 26 and May 30 — "hi", "how are you doing today", "how can I sign up on nexusflo24", etc.) have **no matching row** in `sales_conversations`. The last AI-processed inbound was **May 3 2026**. So `whatsapp-webhook` is storing the message but not calling `ai-sales-closer`.
2. **All recent outbound WhatsApp sends are failing** (status = `failed` for every send today and in the last several days, including your manual "HI" tests). Even if the AI generated a reply, it wouldn't actually go out.
3. **No inbound messages at all today** from +447517327597 — only your outbound test sends. So today's tests didn't even reach the webhook (likely because the outbound failed, so the 24h session never opened, and your replies on WA went to a number that can't deliver back, OR Meta webhook subscription dropped).

## Root causes to investigate & fix

**A. Why `whatsapp-webhook` stopped invoking `ai-sales-closer` after May 3**
- Check the branch in `supabase/functions/whatsapp-webhook/index.ts` that decides whether to call `ai-sales-closer`. Likely culprits:
  - Settings lookup using a wrong column (e.g. checks `enabled` instead of `is_enabled` — same bug pattern we already hit elsewhere).
  - Channel check against `channels` array failing (case / shape mismatch).
  - Early return when the inbound phone doesn't resolve to an existing lead (May 26 and May 30 numbers may be unmatched).
- Add structured logs at every decision branch and re-test.

**B. Why every outbound WhatsApp send is failing**
- Pull last failed `whatsapp_messages` row's `error` column to get Meta's exact error.
- Most likely: 24h customer-care window closed → fallback template path returning failure (we saw "WA window closed — auto-sending via default template `reengagement_followup_v1`" in the edge logs, then no success log after). Either the template isn't approved, the variables don't match, or the credentials mismatch we patched earlier is recurring.

**C. Verify Meta webhook subscription is still live**
- In Meta App Dashboard, confirm the webhook URL points to `https://<project>.functions.supabase.co/whatsapp-webhook` and the `messages` field is subscribed for this WABA.
- If your test "HI" today never arrived as inbound, the subscription likely dropped or you replied from the same number you're sending from (Meta blocks self-loop).

## Fix plan

1. **Read `supabase/functions/whatsapp-webhook/index.ts` end-to-end** and the `ai-sales-closer` invocation block; identify why the May 26 / May 30 inbound messages didn't trigger it.
2. **Inspect the `error` column** on the most recent failed outbound `whatsapp_messages` to get Meta's exact reason. Pull the latest `whatsapp-send` edge function logs around 21:23–21:24 UTC today.
3. **Patch the webhook** so every stored inbound message also calls `ai-sales-closer` when the workspace has `is_enabled=true` and `whatsapp` ∈ `channels`. Add a `WA inbound → AI Sales Closer dispatch` log line on every branch.
4. **Patch the send path** based on what (2) reveals (template name/variables, fresh token, or 24h-window handling).
5. **Re-test** by sending a real inbound WA from your phone to the connected business number and confirming:
   - A new row appears in `whatsapp_messages` with `direction=inbound`.
   - A new row appears in `sales_conversations` with `direction=inbound` and an `intent`.
   - A new outbound `whatsapp_messages` row with `status=sent` (the AI reply).
6. **Surface this in the UI** (optional): add an "AI replied" badge on threads in Messages once the chain is verified working.

## Answer to your question

**No — WhatsApp auto-reply is not firing.** The pipeline is wired in code and your settings are correct, but two things are blocking it:
1. The webhook stopped dispatching inbound WA messages to the AI Sales Closer after May 3.
2. Outbound WhatsApp sends are currently failing, so even a generated AI reply wouldn't deliver.

Approve this plan and I'll move to build mode, read the webhook + send code, pull the failure reason, and patch both.

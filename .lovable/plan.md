# Campaigns page: audit findings and upgrade

I inspected the Campaigns page, the 5-step campaign builder, the sending engine, the trigger paths and the live campaign records. Below is what I confirmed, then what I propose to fix.

## Confirmed problems

**1. A triggered campaign switches itself off after its first lead (highest impact).**
When a campaign sends, the sending engine always marks it `completed` (or `failed` if nothing delivered). Triggered campaigns only fire while their status is `active`, so a triggered campaign runs once for one lead and then never fires again. Your live campaign "summa" is in exactly this position.

**2. Two of the three trigger actions do nothing.**
Step 2 offers "Send campaign message", "Update lead status" and "Add tag to lead". Only sending is implemented; the other two are saved and silently ignored. "summa" has all three ticked.

**3. Website-webhook enquiries never fire triggered campaigns.**
Leads arriving through the website webhook start automations and workflows, but the triggered-campaign check is missing on that path. Only in-app forms/funnels, tag changes, score changes, email opens/clicks and WhatsApp replies fire campaigns.

**4. Scheduled campaigns can sit unsent.**
The every-minute runner checks for due scheduled campaigns *after* an early exit that happens whenever there are no other pending jobs. On a quiet account there are usually no pending jobs, so a scheduled campaign can be skipped repeatedly until something unrelated is queued.

**5. Fallback settings do not behave as the screen promises.**
Step 4 says "Auto-send SMS if primary channel fails", with a condition ("Message unread") and a delay in minutes. In reality the fallback is queued to run immediately, the delay is ignored, and the "unread" condition is never evaluated — it only fires when every primary channel hard-failed.

**6. Sent totals are overwritten, not accumulated.**
Each run replaces `sent_count` with that run's number, so a triggered campaign (one lead per run) would always read 0 or 1 even after many sends.

**7. No guard against an empty message.**
Nothing stops a campaign being saved and launched with an empty body or placeholder text; "summa" currently shows placeholder content.

**8. Smaller gaps.**
Triggered mode has no audience conditions at all (any matching lead is messaged); "tag_removed", "email_opened", "link_clicked", "whatsapp_reply" and "purchase_event" appear in the trigger list but only some have live emitters; the status list has no "failed" colour even though the engine writes that status.

## What I will build

**A. Keep triggered campaigns alive.** The sending engine stops rewriting the status for triggered campaigns — they stay `active` after each fire, and only broadcasts move to `completed`/`failed`. `sent_count` is incremented instead of replaced for triggered runs.

**B. Make the trigger actions real.** "Update lead status" and "Add tag to lead" get their own value pickers in step 2 (real workspace statuses and tags) and are executed by the engine alongside the message, with the result recorded.

**C. Close the firing gaps.** Website-webhook leads fire triggered campaigns the same way in-app captures do, with the same once-per-event guard so a lead is never messaged twice for one event. Trigger events that have no live emitter are labelled "Coming soon" and can't be chosen.

**D. Fix the scheduled-campaign runner.** Due scheduled campaigns are checked on every cron pass, independent of whether any other job is pending, with a guard so one campaign can't be launched twice.

**E. Make fallback honest.** The fallback job respects the configured delay, and the "unread"/"no reply" condition is evaluated before sending (skipped if the recipient already opened or replied). Where a condition cannot be measured for a channel, the screen says so rather than implying it works.

**F. Validation and visibility.** The builder blocks launching with an empty message, a triggered campaign with no trigger selected, or a channel whose provider is not connected. The review step and the campaign drawer show why a campaign is or isn't able to fire, and the list gains the missing "failed" status style.

## Technical notes

- `supabase/functions/execute-campaign/index.ts` — status/sent_count handling per mode, execute `update_status` / `add_tag` actions, fallback `run_at` from `delay_minutes`.
- `supabase/functions/process-scheduled-jobs/index.ts` — move the scheduled-campaign sweep above the empty-jobs early return; add a claim guard (set `status='active'` before invoking).
- `supabase/functions/ingest-leads/index.ts` — add the triggered-campaign dispatch used in `capture-lead`, reusing the existing processed-event dedupe.
- Fallback condition evaluation reads `campaign_messages.opened` / `replied` at job time.
- `src/hooks/useCampaigns.ts` (`TRIGGER_TYPES` gains emitted flags + action value shapes), `src/components/campaigns/CreateCampaignDialog.tsx` (steps 2, 3, 5 validation), `CampaignDetailsDrawer.tsx`, `DashboardCampaigns.tsx` (status colours).
- No schema change required; `trigger_config` gains `status_value` / `tag_value` keys, read defensively so existing campaigns keep working.

After the build I will re-check "summa" and tell you exactly what it will and will not do.

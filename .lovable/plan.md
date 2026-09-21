# Why one webinar signup sent five different message sets

## What actually happened

The lead "Testing Automation" (submitted 21 Sep, 23:27) did not trigger one automation. Five separate things fired within 20 seconds, and each sent its own email and/or WhatsApp:

1. **Whatsapp Lead Follow Webinar** — the correct one (recording email + WhatsApp).
2. **AI Sales Program – 10 Day Lead Nurture Sequence** — email + WhatsApp.
3. **NexusFlo24 - New Lead Welcome & Conversion Engine** — email + WhatsApp.
4. **New Lead - Nurture Sequence - Nexusflo24** — email.
5. **Campaign "summa"** — email + WhatsApp delivered, SMS failed (this is the "Type your text here..." placeholder email in the inbox screenshot).

## Root cause

Those three extra automations are all set to "New lead created" with **no scope at all** — no form, no folder, no tag, no source. So every single lead created anywhere in the account enters all three. The webinar form creates a lead, so it swept them all in. The "summa" campaign is the same: a triggered multi-channel campaign on "new lead" with no filter and placeholder copy still in it.

Nothing is broken in the code — the trigger scoping on these particular records was simply left empty, so they behave as catch-alls.

## The fix

1. **Turn off / pause** the three catch-all automations and the "summa" campaign so nothing else goes out while we sort them.
2. **Scope each one that should stay.** For each of the three, decide with you what it is actually for, then set a real scope (specific form, folder, tag, or lead source) so it only enters the leads it is meant for.
3. **Give the webinar form its own clean path** — the webinar automation stays the only thing that fires for webinar registrants.
4. **Add a guard so this cannot recur**: an unscoped "new lead" automation or triggered campaign gets a clear warning in the builder, and activation shows how many other automations already fire on the same unscoped event, so you can see overlap before switching one on.
5. **Check the stale content** — one of the welcome automations is sending an "AfarHome Booking Confirmed" WhatsApp to NexusFlo24 leads, and "summa" still holds placeholder text. Both need their content reviewed or the steps removed.
6. **Clean up this lead** — cancel the scheduled follow-ups already queued for Testing Automation from the three wrong sequences, so they don't keep arriving over the next days.

## What I need from you

For each of the three catch-all automations, tell me: keep and scope it, or retire it.

- AI Sales Program – 10 Day Lead Nurture Sequence
- NexusFlo24 - New Lead Welcome & Conversion Engine
- New Lead - Nurture Sequence - Nexusflo24
- Campaign "summa"

If you'd rather I just pause all four now and we scope them one at a time afterwards, say so and I'll do that first.

## Technical notes

- Evidence: `automation_logs` for lead `a63b9915` shows `enrolled` + `action:send_email` / `action:send_whatsapp` for automations `42d1c97f`, `34977314`, `33055318`, `aa704b94`; `campaign_messages` shows three rows for campaign `dec03697` ("summa").
- The three offenders have `trigger_type = new_lead` with `trigger_config = {}`; the shared matcher in `_shared/triggerMatch.ts` treats an empty config as "match everything", which is correct behaviour for an unscoped trigger.
- Guard work lands in `CreateAutomationDialog` / `EnrollmentTriggerCard` and `CreateCampaignDialog` as a pre-activation warning; no runtime matcher changes.
- Queued follow-ups are cancelled via `scheduled_jobs` status update for that lead and those automation ids.

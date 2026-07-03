## Goal

When someone submits your Facebook Lead Ad form, Meta pushes it to NexusFlo24 → the lead lands in your CRM → an automation fires an instant Email + WhatsApp/SMS follow-up (and any further nurture steps you choose).

There are two pieces: a **one-time connection** between Meta and NexusFlo24, and a **reusable automation** inside NexusFlo24.

---

## Part 1 — Connect Meta Lead Ads to NexusFlo24 (one-time)

Today the Meta webhook in this project handles Instagram DMs and Facebook comments, but not the `leadgen` event Facebook fires when someone submits a Lead Form. I'll add that.

What I'll build:

1. **Extend the Meta webhook** (`meta-webhook` edge function) to also accept `field: "leadgen"` events.
   - On each event: read `leadgen_id` + `page_id` from the payload.
   - Call Meta Graph API `GET /{leadgen_id}?access_token=PAGE_TOKEN` to pull the full form answers (name, email, phone, plus any custom questions).
   - Normalise the phone to E.164, then insert/merge the lead in the workspace's CRM using the same dedupe rules as the rest of the app (email, then phone).
   - Tag the lead `meta-lead-ad` + the Facebook form name, set source = `Facebook Lead Ad`, and store `form_id`, `ad_id`, `campaign_id` in the lead activity meta so you can filter later.

2. **Subscribe your Facebook Page to the `leadgen` webhook field** — I'll add this to the Meta connection step in Settings → Channels → Meta so it happens automatically when you connect the Page (right now only `messages`/`feed` are subscribed).

3. **Docs card in Settings → Meta** with your webhook URL + verify token and a "Test with Meta Lead Ads Testing Tool" link, so you can fire a test lead and see it hit the CRM.

No new secrets needed — the existing `META_PAGE_ACCESS_TOKEN` / `meta_settings` row is reused.

---

## Part 2 — The follow-up automation (reusable, inside NexusFlo24)

I'll ship a one-click template on the Automations page called **"Facebook Lead Ad → Instant Follow-up"** that seeds this workflow:

```text
Trigger: New lead captured
  └ Filter: source = "Facebook Lead Ad"   (or tag = meta-lead-ad)

Step 1  Send Email          — instant acknowledgement ("Thanks {{first_name}}, we got your details")
Step 2  Wait 3 minutes
Step 3  Send WhatsApp       — approved template; auto-fallback to SMS if the 24h window is closed
Step 4  Move lead to folder "New Lead"
Step 5  Assign salesperson  (round-robin, using the existing assignment engine)
Step 6  Notify salesperson  (in-app + phone alert)
Step 7  Wait 24 hours
Step 8  Condition: appointment booked?
          ├ Yes → Send "Appointment confirmation" email
          └ No  → Send "Booking reminder" WhatsApp/SMS + email
```

All step types already exist in the automation builder — this is just a seeded template using them.

---

## What you'll do after I ship this

1. Open **Settings → Channels → Meta**, click "Connect Facebook Page", pick the Page running the ad.
2. On the Automations page, click **Use template → "Facebook Lead Ad → Instant Follow-up"**, tweak the email/WhatsApp copy, hit Activate.
3. In Facebook Ads Manager, make sure the Lead Form is attached to the same Page you connected. Fire a test lead from Meta's [Lead Ads Testing Tool](https://developers.facebook.com/tools/lead-ads-testing) — you'll see it appear in Leads within seconds and the follow-up messages go out.

That's it — every future lead from that ad flows in automatically.

---

## Technical notes (for reference)

- Files touched: `supabase/functions/meta-webhook/index.ts` (add leadgen branch), `supabase/functions/meta-save-settings/index.ts` (subscribe `leadgen` field on Page), `src/components/settings/MetaChannelTab.tsx` (webhook + test link UI), `src/lib/automations/seedNurtureTemplate.ts` (new template) + a "Use template" entry on `DashboardAutomations`.
- Uses existing `capture-lead` dedupe logic and `execute-automation` runner — no schema changes.
- WhatsApp step auto-falls back to SMS via the existing 24h-window handling.

Shall I build it?

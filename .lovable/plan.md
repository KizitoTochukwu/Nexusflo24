

## Goal
Build a 14-day, multi-channel nurture automation that warms up your **Nasio Contacts** folder (and only that folder) and pushes every lead toward booking a discovery call.

## How it works
The automation is scoped to the Nasio Contacts folder. When a lead lands there, it enters a 6-touch sequence across Email → WhatsApp → SMS, with smart branching: if a lead replies or books a call, the sequence auto-stops and they move into the sales pipeline.

## The 14-day sequence

```text
Day 0  →  Email #1   "Welcome — quick intro + value"
Day 2  →  WhatsApp   "Personal hello + soft CTA to book"
Day 4  →  Email #2   "Case study / social proof + booking link"
Day 7  →  Email #3   "Address top objection + booking link"
Day 10 →  SMS        "Short nudge — limited slots this week"
Day 14 →  Email #4   "Final value email — last chance to book"
```

Branching at every step:
- If **lead replies** on any channel → stop sequence, tag `engaged`, move to pipeline stage **Engaged**.
- If **booking is made** (`book_appointment` event) → stop sequence, move to **Demo Booked**.
- If **no reply by Day 14** → tag `cold`, move to pipeline stage **Cold**, hand off to AI Sales Closer for one final attempt.

## What gets built

### 1. One automation: "Nasio Contacts — 14-Day Nurture to Booking"
- **Trigger:** New lead added (scoped to Nasio Contacts folder via `trigger_config.folder_id`)
- **Steps:** 6 sends + 5 delays + 2 reply-status conditions = ~13 steps
- **Status:** Created as **Draft** so you can review every email body before activating

### 2. Pre-filled message copy (your branded voice)
Each email uses the existing AutomationEmailEditor with your brand colors (Navy/Gold) and a primary CTA button pointing to your booking page (`{{booking_link}}`). Subject lines and bodies are written specifically for the Nasio audience — not generic presets — and personalized with `{{first_name}}` and `{{company}}`.

WhatsApp + SMS messages are short, conversational, and end with the same booking link.

### 3. One-time enrollment of the existing 653 leads
The trigger only fires for *new* leads going forward. Since your Nasio Contacts are already imported, we'll add a **"Enroll existing folder leads"** button in the automation details drawer. Clicking it queues every lead in the chosen folder into the workflow via the existing `execute-automation` infrastructure.

### 4. Trigger scope guard
Update `check-campaign-triggers` / `execute-automation` to honor `trigger_config.folder_id` so this automation only fires for leads in the Nasio Contacts folder, not your future folders.

## What you'll see in the UI
1. New automation row in **Automations** tab: *"Nasio Contacts — 14-Day Nurture to Booking"* (Draft)
2. Open it → review/edit each email + WhatsApp + SMS message inline
3. Click **"Enroll 653 leads from Nasio Contacts"** → confirms count, queues them
4. Toggle status to **Active**
5. Watch run count, open/click rates, and bookings tick up in the **Logs** tab

## Prerequisites we'll verify before activating
- **Email channel:** Resend or Lovable Email already configured (you have it)
- **WhatsApp channel:** Needs your WhatsApp Cloud API setup in Settings → Channels — if missing, those steps will skip with a warning instead of breaking the flow
- **SMS channel:** Needs Twilio setup in Settings → Channels — same fallback behavior
- **Booking page:** Confirm `{{booking_link}}` resolves to your active booking page

If WhatsApp or SMS isn't configured yet, the automation still runs — those steps simply log "channel not configured" and continue, so email-only leads still get nurtured.

## Files touched
- `supabase/migrations/` — insert the automation + 13 steps for your workspace as Draft
- `src/components/automations/AutomationDetailsDrawer.tsx` — add "Enroll existing folder leads" button
- `src/hooks/useAutomations.ts` — add `useEnrollFolderLeads` mutation
- `supabase/functions/execute-automation/index.ts` — accept manual enrollment payloads + respect `trigger_config.folder_id`
- `supabase/functions/check-campaign-triggers/index.ts` — folder-scoped trigger filter
- New helper edge function: `enroll-folder-leads` — queues every lead in a folder into one automation run

## Out of scope
- AI-generated copy variants (can add later via `generate-campaign-copy`)
- A/B testing subject lines (Pro-tier feature)
- Lead scoring threshold branching (already supported, not needed for this flow)


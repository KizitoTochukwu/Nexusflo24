

## Webinar Follow-up Workflow — "AI Sales Blueprint → May 3 Webinar"

A 10-day, multi-channel nurture sequence that re-engages your 500+ ebook leads, drives them to register and show up to the webinar on **3 May 2026**, then splits attendees from no-shows for the right post-event follow-up.

### How leads enter the workflow

Since the leads are already in the CRM (imported from your Facebook/Instagram ad), we'll create a **"Webinar – AI Sales Blueprint"** folder, then move all 500+ leads into it. The workflow trigger is **"Lead added to folder"**, so every lead in that folder gets enrolled the moment we publish the workflow. (You don't need to re-import or run a campaign — moving them into the folder fires the trigger.)

### The sequence at a glance (T-10 → T+3 days)

```text
DAY 0 (T-10) ── Email #1: "Your AI Sales Blueprint + an invite"
              │  → registration link to webinar
              ▼
              Wait 1 day
              ▼
DAY 1 (T-9)  ── IF email opened?
              ├── YES → Tag: webinar-interested → Score +10
              │         → Email #2: "Here's exactly what you'll learn"
              │
              └── NO  → Email #2b: resend with new subject
                        ("Did you miss this? Free webinar 3 May")
              ▼ (merge)
              Wait 3 days
              ▼
DAY 4 (T-6)  ── WhatsApp #1: short personal nudge w/ register link
              ▼
              Wait 2 days
              ▼
DAY 6 (T-4)  ── Email #3: "What 500+ marketers asked me to cover"
                          (social proof + agenda + register CTA)
              ▼
              Wait 2 days
              ▼
DAY 8 (T-2)  ── IF tag "webinar-registered"?
              ├── YES → Email: "You're in — save the Zoom link"
              │         → Wait 1 day → SMS reminder T-1
              │         → Wait 1 day → WhatsApp reminder 1h before
              │         → Email post-webinar split (below)
              │
              └── NO  → Email #4: "Last chance — doors close in 48h"
                        → Wait 1 day → WhatsApp final nudge (T-1)
                        → Wait 1 day → SMS day-of: "Starts in 1h, join here"
              ▼ (merge after webinar — DAY 10 / 3 May)
              Wait 1 day
              ▼
DAY 11 (T+1) ── IF tag "webinar-attended"?
              ├── YES → Email: "Thanks for joining — your replay + bonus offer"
              │         → Tag: hot-lead → Score +30
              │         → Goal: Booked sales call / purchase
              │
              └── NO  → Email: "Sorry we missed you — here's the replay"
                        → Wait 2 days → Email: limited-time offer
                        → Tag: webinar-no-show
```

### Building it on the canvas — node-by-node

I'll drag each step from the palette and configure it in the right inspector. All copy is pre-written and ready to edit.

**Trigger**
- `Lead added to folder` → folder = **Webinar – AI Sales Blueprint**

**Pre-webinar nurture (Days 0–8)**
1. `Send Email` — "Your AI Sales Blueprint + an exclusive invite" (with register link)
2. `Wait` — 1 day
3. `If email opened` (condition)
   - **YES** → `Add tag: webinar-interested` → `Increase score +10` → `Send Email` (deeper value + register CTA)
   - **NO** → `Send Email` resend with new subject line
4. `Merge` both branches
5. `Wait` — 3 days
6. `Send WhatsApp` — short, personal nudge with register link
7. `Wait` — 2 days
8. `Send Email` — agenda preview + social proof
9. `Wait` — 2 days

**Registration split (T-2 → T-0)**
10. `If lead has tag` → `webinar-registered`
    - **YES branch**: confirmation email → wait 1 day → `Send SMS` (T-1 reminder) → wait 1 day → `Send WhatsApp` (1h before)
    - **NO branch**: "last chance" email → wait 1 day → `Send WhatsApp` final nudge → wait 1 day → `Send SMS` "starts in 1 hour"

**Post-webinar (Day 11+)**
11. `Wait` — 1 day after webinar
12. `If lead has tag` → `webinar-attended`
    - **YES** → replay + bonus offer email → `Add tag: hot-lead` → `Increase score +30` → `Goal: Booked / Purchased`
    - **NO** → "missed it — here's the replay" → wait 2 days → limited-time offer → `Add tag: webinar-no-show`

### What you need to do once before publishing

1. Create the folder **Webinar – AI Sales Blueprint** (Leads → Folders → New).
2. Bulk-select your 500+ ebook leads → "Move to folder".
3. Open the workflow, fill in your real **Zoom/registration link** in each email/WhatsApp/SMS body (placeholders are pre-filled).
4. Click **Publish** — leads get enrolled and the sequence starts.

The two tags **webinar-registered** and **webinar-attended** are how the branches know who registered and who showed up. You'll add **webinar-registered** automatically via the registration form (or manually for now), and **webinar-attended** after the event from your Zoom export — bulk-tag in 30 seconds.

### Files touched

- `src/lib/workflows/templateSeeds.ts` — add a new `webinarLaunchFlow` template seed: **"Webinar Launch – 10 day sequence"** (category: Events, featured), so it shows up under **Templates** in the Workflow Builder. Uses `lead_added_to_folder` trigger with the full node/edge graph above (~25 nodes).
- That's the only file change. The trigger types, action types, conditions, delay node, merge, and goal node already exist in the palette (`nodeLibrary.ts`) — no new node kinds needed.

### After this turn

You'll see the new template in **Workflow Builder → Templates → "Webinar Launch – 10 day sequence"** (Featured). Click **"Use this template"** to instantiate it as a real workflow you can edit, fill in your registration link, and publish.

### Out of scope

- Sending the actual Zoom invite / calendar `.ics` (that comes from your webinar platform).
- Auto-detecting webinar attendance via Zoom API (you tag attendees manually or via CSV import for now).
- Building a registration landing page (use your existing funnel or Zoom's registration page).
- Any change to the workflow execution engine — this is purely a new template definition.




## Plan: Dynamic Lead Scoring Engine

### Overview
Build an automatic lead scoring system that updates scores based on engagement activities, auto-promotes lead status at score thresholds, and triggers notifications when leads become hot.

### Architecture

```text
lead_activities INSERT
       │
       ▼
 DB Trigger: trg_score_on_activity
       │
       ▼
 DB Function: update_lead_score_on_activity()
   ├─ Look up score delta from lead_scoring_rules table
   ├─ UPDATE leads SET score = score + delta
   ├─ Map score → status (Cold/Warm/MQL/SQL/Hot)
   ├─ UPDATE leads SET status if changed
   └─ If score ≥ 80: INSERT into notifications
```

### Database Changes (1 migration)

**1. Create `lead_scoring_rules` table**
- Columns: `id`, `workspace_id`, `activity_type` (text), `score_delta` (integer), `label` (text)
- RLS: workspace members can CRUD
- Seed default rules per workspace via the scoring function (or we use a fallback map in the DB function)

**Better approach**: Use a hardcoded scoring map inside the DB function (no extra table needed for MVP — simpler, faster). Rules:

| Activity Type | Delta |
|---|---|
| `form_submit` | +10 |
| `email_open` | +5 |
| `link_click` | +10 |
| `lead_magnet_download` | +20 |
| `website_visit` | +5 |
| `pricing_page_visit` | +25 |
| `webinar_registration` | +30 |
| `call_booking` | +50 |
| `email_unsubscribe` | -50 |
| `stage_change` | 0 |
| `manual_note` | 0 |

**2. Create DB function `update_lead_score_on_activity()`**
- `SECURITY DEFINER`, triggered AFTER INSERT on `lead_activities`
- Looks up delta from a CASE statement on `NEW.type`
- Updates `leads.score` (clamped to 0 minimum)
- Derives status from score thresholds:
  - 0–20: "New" (Cold)
  - 21–50: "Warm"
  - 51–80: "Warm" (MQL — we map to existing statuses)
  - 81–100: "Hot" (SQL)
  - 100+: "Hot" (Hot Buyer)
- If score crosses ≥ 80 and old status wasn't "Hot", inserts a notification row and updates status to "Hot"

**3. Create trigger `trg_lead_score_on_activity`**
- AFTER INSERT on `lead_activities` → calls `update_lead_score_on_activity()`

**4. Create DB function `decay_inactive_leads()`**
- Finds leads with `last_activity_at < now() - 30 days` and score > 0
- Decrements score by 20, updates status accordingly
- This can be called manually or via a cron (future); for now we create the function

### Frontend Changes

**5. Update `LeadDetailsDrawer.tsx`**
- Add a score stage badge below the score number showing the label (Cold Lead / Warm Lead / MQL / SQL / Hot Buyer) with color coding
- Score still manually editable (override)

**6. Update `useLeads.ts`**
- No changes needed — the DB trigger handles scoring automatically. The existing query invalidation on activity log already refreshes lead data.

### What this enables
- Every `logActivity.mutate()` call (manual notes, form submissions, etc.) automatically adjusts the lead score via the DB trigger
- The `capture-lead` edge function already logs `form_submit` activities, so new leads get +10 automatically
- Status auto-promotes without any frontend logic
- Hot lead notifications appear in the notification bell automatically

### No edge function changes needed
The existing `capture-lead` function already inserts into `lead_activities` with type `form_submit` — the new trigger will handle the rest.


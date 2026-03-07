

## Plan: Live Automation Execution + Event Tracking

### Overview
Three interconnected features: (1) a backend edge function that executes automation steps for real (send emails, SMS, WhatsApp, update leads), (2) email open/click tracking via pixel and redirect endpoints, and (3) a website visit tracking endpoint that logs page views to `lead_activities`.

### Architecture

```text
                    ┌─────────────────────────┐
                    │  DB Trigger on           │
                    │  lead_activities INSERT   │
                    │  (scoring — already done) │
                    └──────────┬──────────────┘
                               │
          ┌────────────────────▼────────────────────┐
          │  NEW: DB trigger trg_run_automations     │
          │  → calls run_matching_automations()      │
          │  → for each active automation matching   │
          │    the trigger_type, invokes             │
          │    execute-automation edge function       │
          └──────────┬──────────────────────────────┘
                     │
      ┌──────────────▼──────────────────┐
      │  NEW: execute-automation EF      │
      │  Receives: automation_id,        │
      │    lead_id, workspace_id         │
      │  Processes steps in order:       │
      │  - send_email → calls email-send │
      │  - send_sms → calls sms-send     │
      │  - send_whatsapp → whatsapp-send │
      │  - add_tag / remove_tag          │
      │  - update_status                 │
      │  - delay (skip in v1)            │
      │  - notify_sales → notification   │
      │  Logs each step to automation_logs│
      └─────────────────────────────────┘
```

**However**, calling an edge function from a DB trigger is complex and unreliable. A simpler approach:

### Revised Architecture — Trigger from `capture-lead` and a new `track-event` function

Instead of DB triggers calling edge functions, we fire automations from the edge functions that create the events:

1. **`execute-automation` edge function** — Takes `automation_id`, `lead_id`, `workspace_id`. Executes each step live.
2. **Update `capture-lead`** — After creating a lead + logging activity, query active automations with `trigger_type = 'new_lead'` and call `execute-automation` for each.
3. **New `track-event` edge function** — Public endpoint accepting `{ email, event_type, meta }`. Looks up the lead by email, inserts into `lead_activities`, then checks for matching automations (e.g. `email_opened`, `link_clicked`, `website_visit`) and executes them.
4. **New `track-open` edge function** — Returns a 1x1 transparent pixel GIF. Parses `lead_id` + `workspace_id` from query params, logs `email_open` activity.
5. **New `track-click` edge function** — Redirect endpoint. Logs `link_click` activity, then 302-redirects to the target URL.

### Database Changes

**Migration: Create `increment_automation_run` helper function**
- Simple SQL function to atomically increment `run_count` and set `last_run_at`

### Edge Functions

**1. `execute-automation/index.ts`** (NEW)
- Auth: service-role only (called internally)
- Input: `{ automation_id, lead_id, workspace_id }`
- Fetches automation steps ordered by `step_order`
- Fetches lead data for variable interpolation
- For each step:
  - `action:send_email` → call Resend API directly with interpolated message
  - `action:send_sms` → call Twilio API directly
  - `action:send_whatsapp` → call WhatsApp API directly
  - `action:add_tag` → UPDATE leads SET tags = array_append
  - `action:remove_tag` → UPDATE leads SET tags = array_remove
  - `action:update_status` → UPDATE leads SET status
  - `action:notify_sales` → INSERT into notifications
  - `condition` steps → evaluate and skip remaining if false
  - `delay` steps → skip (note in log; real delays need queue infrastructure)
- Logs each step result to `automation_logs`
- Increments `run_count` and `last_run_at` on the automation

**2. `track-open/index.ts`** (NEW)
- No JWT verification (called from email clients)
- URL format: `/track-open?lid=<lead_id>&wid=<workspace_id>&cid=<campaign_id>`
- Inserts `email_open` into `lead_activities`
- Updates `campaign_messages` SET opened = true if `cid` provided
- Returns 1x1 transparent GIF

**3. `track-click/index.ts`** (NEW)
- No JWT verification
- URL format: `/track-click?lid=<lead_id>&wid=<workspace_id>&url=<encoded_target>&cid=<campaign_id>`
- Inserts `link_click` into `lead_activities`
- Updates `campaign_messages` SET clicked = true if `cid` provided
- 302 redirects to decoded target URL

**4. `track-event/index.ts`** (NEW)
- No JWT verification (called from embedded tracking script)
- Input: `{ email, workspace_id, event_type, meta }` or identified by `lid` (lead_id)
- Supported events: `website_visit`, `pricing_page_visit`, `lead_magnet_download`, `webinar_registration`, `call_booking`
- Looks up lead by email + workspace, inserts into `lead_activities`
- Checks for matching active automations and calls execute-automation internally

**5. Update `capture-lead/index.ts`**
- After lead creation/activity logging, query active automations with `trigger_type = 'new_lead'` in the workspace
- For each, call `execute-automation` via internal fetch

**6. Update `email-send/index.ts`**
- Wrap email HTML with tracking pixel: append `<img src="https://.../track-open?lid=...&wid=..." />` before `</body>`
- Rewrite links to go through `/track-click?url=...&lid=...&wid=...`

### Frontend Changes

**7. Update `DashboardSettings.tsx`**
- Add a "Website Tracking" section with a copyable JavaScript snippet:
```html
<script src="https://stuaikfyuwcjmchcvfie.supabase.co/functions/v1/track-event?embed=1&wid=WORKSPACE_ID"></script>
```
- The snippet auto-tracks page views and pricing page visits

### Config Changes

**8. `supabase/config.toml`**
- Add entries for new functions with `verify_jwt = false`:
  - `execute-automation`, `track-open`, `track-click`, `track-event`

### Summary of deliverables
| Feature | Mechanism |
|---|---|
| Live automation execution | `execute-automation` EF called from `capture-lead` and `track-event` |
| Email open tracking | `track-open` EF returns pixel, logs `email_open` |
| Email click tracking | `track-click` EF redirects, logs `link_click` |
| Website visit tracking | `track-event` EF called from embedded JS snippet |
| Scoring integration | Existing `trg_lead_score_on_activity` trigger handles all new event types automatically |


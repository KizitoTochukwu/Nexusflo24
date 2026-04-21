

## Goal
Expand the **Condition** dropdown in the Automation Step Editor so users can branch on more lead signals — engagement, channel activity, pipeline state, time, and bookings — and add a few matching **Trigger** and **Action** options so the new conditions are useful end-to-end.

## New Condition options (added to `CONDITION_OPTIONS`)

Engagement & behavior
- **Email opened** — fired in last N days
- **Email NOT opened** — no opens in last N days
- **Link clicked** — clicked any tracked link in last N days
- **Has booked appointment** — yes/no
- **Has unsubscribed** — yes/no (auto-skip messaging if true)

Lead profile
- **Has email address** / **Has phone number** (channel-readiness gate before sending WhatsApp/SMS)
- **Lead source equals** *(already exists — keep)*
- **Lead status equals** — picks from CRM statuses (New/Warm/Hot/Won/Lost)
- **Pipeline stage equals** — picks from 8-stage sales pipeline
- **Folder membership** — lead is in folder X
- **Lead score between X and Y** — range (complements existing `score_gt`)
- **Lead score less than X**

Time-based
- **Lead age greater than N days** — created_at older than N
- **Days since last activity greater than N** — for re-engagement branches
- **Day of week is** — only branch on Mon–Fri etc. (avoid weekend sends)

Each new condition reuses the existing `value` input pattern, except those needing two inputs (range, days+unit) which get a small inline second field.

## New Trigger options (added to `TRIGGER_OPTIONS`)
- **Form submitted** — funnel/embed form submission
- **Pipeline stage changed** — fires when lead moves to a chosen stage
- **Lead replied (any channel)** — unifies email/WA/SMS inbound
- **Booking cancelled** — pair with `book_appointment`
- **Inactivity detected** — no activity for N days (for win-back automations)

## New Action options (added to `ACTION_OPTIONS`)
- **Move to pipeline stage** — direct stage update (today only `update_status` exists)
- **Assign to team member** — round-robin or specific user
- **Move lead to folder** — reorganize CRM
- **Trigger AI Sales Closer** — hand off to Nexus AI for live conversation
- **Create task / reminder** — internal task with due date
- **Webhook out** — POST lead payload to an external URL (Zapier/Make)
- **Add to campaign** — enroll lead in a chosen broadcast/sequence

## Implementation

### 1. `src/hooks/useAutomations.ts`
Extend the three constant arrays. Each entry keeps the same `{ value, label }` shape so the existing dropdowns auto-render them. New conditions that need a secondary input declare a `secondaryConfigKey` (e.g. `days`, `max`, `folder_id`).

### 2. `src/components/automations/AutomationStepEditor.tsx`
- Render the right input(s) per condition: text, number, date-range, folder picker, pipeline stage picker, day-of-week multi-select.
- Same pattern for new actions: pipeline stage picker, folder picker, team-member picker, webhook URL input, campaign picker.
- Keep the existing reply-status branching UI as-is.

### 3. `supabase/functions/execute-automation/index.ts`
Add evaluators for each new condition and executors for each new action:
- Engagement queries hit `lead_events` / `email_events` / `tracking_events` (already used by event tracking).
- Booking checks query `bookings` table by `lead_id`.
- Folder/pipeline/status updates write to `lead_folder_leads` and `leads`.
- Webhook out uses `fetch()` with timeout + retry; logs to `automation_logs`.
- AI Sales Closer handoff invokes existing `ai-sales-closer` edge function.
- Add-to-campaign inserts into `campaign_recipients` and triggers `execute-campaign`.

### 4. `supabase/functions/check-campaign-triggers/index.ts`
Add detection for the new triggers (`form_submitted`, `pipeline_stage_changed`, `lead_replied`, `booking_cancelled`, `inactivity_detected`).

## Files touched
- `src/hooks/useAutomations.ts`
- `src/components/automations/AutomationStepEditor.tsx`
- `supabase/functions/execute-automation/index.ts`
- `supabase/functions/check-campaign-triggers/index.ts`

## Out of scope
- A/B test branching (separate Pro-tier feature)
- Visual flowchart canvas (current editor stays linear with the existing reply-status fork)
- Custom JS/expression conditions




## Add Exit Criteria to Automations

### What this solves
Today, once a lead enters an 8-day nurture sequence, every queued step still fires — even if they purchase on day 4. We'll let you define **Exit Criteria** so leads automatically drop out of an automation the moment a goal event happens (purchase, tag added, status reached, etc.). Pending scheduled steps for that lead are cancelled.

### How it behaves (your day-4 purchase example)
- **Lead A** (purchases on Day 4): the purchase event triggers a sweep that cancels their remaining Day 5–8 jobs. They stop receiving the nurture sequence and (optionally) get tagged `customer` or moved to a "Won" stage.
- **Lead B** (no purchase): nothing changes — they continue through Day 5, 6, 7, 8 as queued.
- **Lead C** (purchases on Day 8 after the last email already went out): no jobs left to cancel; they simply complete the sequence. They are not re-enrolled.

### UI changes

**1. Automation editor → new "Exit Criteria" section** (above Steps, below Trigger)
- Heading: *"Exit this automation when…"* with a short helper line: *"If any of these happen, pending steps for that lead are cancelled."*
- "Add exit rule" button. Each rule has:
  - **Event** dropdown (reuses condition vocabulary):
    - Purchase happened
    - Appointment booked
    - Tag added (with tag value field)
    - Status becomes (with status dropdown)
    - Email replied / WhatsApp replied
    - Unsubscribed
  - "Remove" (×) button
- Multiple rules = OR logic ("if **any** of these happen").
- Optional toggle: *"Also run these actions on exit"* → small inline list (Add tag / Remove tag / Update status) so users can e.g. tag `completed-nurture` when a lead exits via purchase.

**2. Automation list page** — small badge "Exits on purchase" / "Exits on 2 events" next to the trigger column so users see at a glance which automations have exit rules.

**3. Logs tab** — new event type `exited` showing reason: *"Lead exited — purchase happened (3 pending steps cancelled)"*.

### Backend changes

**Storage**
- Add `exit_criteria` (jsonb, default `[]`) and `exit_actions` (jsonb, default `[]`) columns to `automations`.
- Shape:
  ```json
  exit_criteria: [
    { "event": "purchase_happened" },
    { "event": "tag_added", "value": "customer" },
    { "event": "status_equals", "value": "Won" }
  ]
  exit_actions: [
    { "action": "add_tag", "tag": "completed-nurture" }
  ]
  ```

**New helper: `cancel-automation-jobs` (shared logic, called from triggers)**
When any of these events fire for a lead, we look up active automations whose `exit_criteria` matches, then:
1. `UPDATE scheduled_jobs SET status = 'cancelled', error = 'exit_criteria_met:<event>' WHERE lead_id = X AND automation_id = Y AND status = 'pending'`
2. Insert a row into `automation_logs` with `event_type = 'exited'`, details = `{ reason, cancelled_count }`.
3. Run `exit_actions` (tag/status updates) once.

**Wire-up points** (where exit sweeps are triggered)
- `capture-lead` / purchase tracking → on `purchase_event`
- `track-event` → on `tag_added`, `appointment_booked`, `unsubscribe`
- `update_lead_score_on_activity` (DB trigger) — extend to fire on status change to "Won"
- `unsubscribe` edge function → already updates lead, we add the cancel sweep

**Process-scheduled-jobs**
Add a defensive double-check: before running a job, re-verify the lead doesn't match the automation's exit criteria. Catches edge cases where the sweep raced a job that was already in `running` state.

### Technical details

**Files to add**
- `supabase/migrations/...sql` — adds `exit_criteria` + `exit_actions` columns + index on `scheduled_jobs (lead_id, automation_id, status)` for fast cancel sweeps.
- `supabase/functions/_shared/exit-criteria.ts` — `evaluateExitCriteria(lead, criteria)` + `cancelAutomationJobs(supabase, {workspace_id, lead_id, event_type, value?})`.
- `src/components/automations/ExitCriteriaEditor.tsx` — new editor block.

**Files to edit**
- `src/hooks/useAutomations.ts` — extend `Automation` type, propagate `exit_criteria` + `exit_actions` through create/update mutations.
- `src/components/automations/AutomationDetailsDrawer.tsx` — render `<ExitCriteriaEditor>` between Trigger and Steps; include in save payload.
- `src/components/automations/CreateAutomationDialog.tsx` — optional: prefill empty array.
- `src/pages/dashboard/DashboardAutomations.tsx` — show exit-rule badge in the table.
- `supabase/functions/capture-lead/index.ts`, `track-event/index.ts`, `unsubscribe/index.ts`, `book-appointment/index.ts` — call `cancelAutomationJobs` after the relevant write.
- `supabase/functions/process-scheduled-jobs/index.ts` — pre-execution exit-criteria recheck.
- `supabase/functions/execute-automation/index.ts` — at the top of each step iteration, re-evaluate exit criteria and short-circuit if matched (for in-flight long sequences).

**Event → criteria matching**
| Trigger source | Matches `exit_criteria.event` |
|---|---|
| Purchase recorded | `purchase_happened` |
| Tag added to lead | `tag_added` (compares `value` if set) |
| Lead status updated | `status_equals` (compares `value`) |
| Appointment booked | `appointment_booked` |
| Inbound reply (email/WA/SMS) | `reply_received` |
| Unsubscribe | `unsubscribed` |

### Defaults & safety
- Default exit criteria for **new automations whose trigger is a nurture-style event** (e.g. `lead_added_to_folder`, `new_lead`): pre-populated with `purchase_happened` + `unsubscribed` so users get sensible defaults out of the box. They can remove them.
- Cancellation is **idempotent** — running the sweep twice does nothing the second time.
- We never cancel `running` jobs, only `pending`. The pre-execution recheck handles the race window.

### QA
1. Create an 8-step nurture automation triggered by "Lead added to folder X". Add exit criterion *"Purchase happened"*.
2. Add a lead to folder X → confirm 8 jobs queued in `scheduled_jobs`.
3. Manually insert a `purchase_event` for that lead (via track-event) on day 4.
4. Verify: remaining jobs become `cancelled` with reason `exit_criteria_met:purchase_happened`, `automation_logs` shows an `exited` event, lead receives no further emails.
5. Repeat without a purchase — confirm all 8 emails still send.
6. Add a second lead, exit on `tag_added=customer`. Tag the lead → same cancellation behaviour.
7. Confirm the exit-rule badge appears on the Automations list page.


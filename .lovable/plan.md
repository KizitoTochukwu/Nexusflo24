

## Confirming Exit Criteria & Automation Logic Are Working

### What I verified (already correct in your codebase)

✅ **Database** — `automations.exit_criteria` and `automations.exit_actions` columns exist, both `jsonb default '[]'`.
✅ **UI** — `ExitCriteriaEditor` is wired into both `CreateAutomationDialog` and `AutomationDetailsDrawer`, with smart defaults pre-filled for nurture-style triggers (`new_lead`, `lead_added_to_folder`, `form_submitted`, etc.).
✅ **Hooks** — `useCreateAutomation` / `useUpdateAutomation` save `exit_criteria` to the DB.
✅ **Cancellation sweep** — `fireAutomationsForLeads` (`src/lib/automations/fireTriggers.ts`) scans active automations on every event and bulk-cancels matching pending `scheduled_jobs`, then writes an `exit_criteria:<event>` row to `automation_logs`.
✅ **Defense-in-depth** — `execute-automation` re-evaluates exit criteria on every scheduled resume and aborts with an `exit_criteria:<type>` log if matched (catches race conditions).

### What I found in your live data

⚠️ **Zero automations currently have exit criteria set** — every row in `automations.exit_criteria` is `[]`. That means there is nothing for the system to "fire" yet, which is why `automation_logs` shows no `exit_criteria:*` rows and no `scheduled_jobs` are marked with `error LIKE 'Exit criteria met%'`.

Your existing nurture automations (e.g. *AI Sales Blueprint – New Lead Nurture*, *10 Day Lead Nurture Sequence*) were created **before** the exit-criteria feature shipped, so they have no rules. The smart defaults only auto-fill for *newly-created* nurture automations.

### How to confirm it's firing — 3-step verification

**Step 1 — Add exit criteria to an existing nurture automation**
- Open any active multi-day automation (e.g. *AI Sales Blueprint*).
- In the drawer, scroll to the new **"Exit criteria"** block.
- Click **"Use suggested defaults"** → adds `Lead purchases` + `Lead unsubscribes`.
- Save.

**Step 2 — Trigger the automation for a test lead**
- Create a test lead (or pick one with no pending jobs). The first delay step will queue jobs in `scheduled_jobs`.
- Confirm jobs queued: I can run a query like
  `SELECT id, run_at, status FROM scheduled_jobs WHERE lead_id='<test-lead>' AND automation_id='<auto>' ORDER BY run_at;`

**Step 3 — Trigger the exit event and confirm the cancel**
Three ways to fire an exit:
  - **Unsubscribe** — open the unsubscribe URL for the test lead. The `unsubscribed` tag gets added → next page action fires `fireAutomationsForLeads` → sweep cancels remaining jobs.
  - **Purchase** — call the `track-event` edge function with `type=purchase` for the lead.
  - **Tag** — manually add the configured tag to the lead.

Then confirm:
1. `scheduled_jobs` rows for that lead/automation flip to `status='cancelled'` with `error='Exit criteria met: <event>'`.
2. `automation_logs` gets new rows with `event_type='exit_criteria:<event>'`, `status='cancelled'`.
3. The lead receives no further messages from that automation.

### What I'll add to make this self-service for you (the actual implementation work)

To make verification a one-click thing instead of running SQL manually, I'll add:

1. **"Test exit criteria" button** in `AutomationDetailsDrawer` — pick a lead, simulate one of the configured exit events, and show a result toast (e.g. *"3 pending jobs cancelled, 1 log written"*).
2. **Backfill helper** in the Automations list — small banner: *"3 active nurture automations have no exit criteria — apply suggested defaults?"* with a one-click "Apply to all" action that uses `getDefaultExitCriteria` per trigger type.
3. **Logs tab filter** — a chip on the Logs tab that filters to `exit_criteria:*` events so you can see at a glance whether exits have fired for that automation.
4. **Counter on the automation card** — show *"X leads exited"* alongside the existing run-count, sourced from `automation_logs` where `event_type LIKE 'exit_criteria:%'`.

### Files I'll touch

- `src/components/automations/AutomationDetailsDrawer.tsx` — add "Test exit" button + lead picker + result toast.
- `src/components/automations/AutomationDetailsDrawer.tsx` (Logs tab) — add filter chip for exit events.
- `src/pages/dashboard/DashboardAutomations.tsx` — add backfill banner + per-row "Exited" count.
- `src/hooks/useAutomations.ts` — new `useExitedCount(automationId)` query + `useBackfillExitDefaults()` mutation.
- `src/lib/automations/exitCriteria.ts` — small helper `simulateExitEvent({ automationId, leadId, eventType })` that calls the same code path the live triggers use.

### Why this is enough

- The cancellation logic is already covered in two places (live event sweep + on-resume re-check) — the gap is purely *visibility* and the fact that legacy automations have no rules. The plan above closes both.
- After backfill + one test run, you'll have concrete log entries and cancelled jobs you can point at to prove "yes, it fires."


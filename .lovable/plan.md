

## Goal
Give you a repeatable, no-guessing way to confirm the **Webinar Launch — 10-day sequence** workflow is wired correctly and actually firing end-to-end.

## What "working end-to-end" means here
A workflow is healthy when all 5 layers light up in order:

```text
1. Workflow saved & ACTIVE        → workflows.status = 'active'
2. Trigger fires on real event    → workflow_logs row: event_type='enrolled'
3. Enrollment created             → workflow_enrollments row, status='active'
4. Steps execute / schedule       → workflow_runs rows + scheduled_jobs rows for delays
5. Side effects land              → email_logs / lead_activities / leads.tags updated
```

If any layer is missing, that's exactly where the break is.

---

## Verification plan (3 phases)

### Phase 1 — Static checks (in the editor, no firing yet)
On `/workflows/<id>`:

1. **Status badge = Active** (top-right). If it says Draft/Paused, leads will never enroll.
2. **Trigger node is configured** — open it in the right panel and confirm:
   - Trigger type matches your real event (e.g. `lead_added_to_folder` with the correct `folder_id`, or `lead_tagged` with the correct tag).
3. **Every condition node has BOTH YES and NO wired** (gold + red edges). Unwired branches silently end the flow.
4. **No orphan nodes** — every action/delay traces back to the trigger via edges.
5. **Save** — unsaved edits don't run.

### Phase 2 — Live fire test (controlled, with a real lead)
1. Create a throwaway test lead with your real email.
2. Trigger the exact event the workflow listens for:
   - `lead_added_to_folder` → move the test lead into "Webinar – AI Sales Blueprint".
   - `lead_tagged` → apply the matching tag.
3. Within a few seconds the lead should enroll. Open the workflow's **Runs / Logs** view (right side of the editor or workflow detail) and confirm a new row appears.

### Phase 3 — Backend confirmation (the source of truth)
I'll add a **"Run Diagnostics" button** on the workflow editor that queries:

- `workflow_enrollments` count for this workflow (last 24h, by status)
- Latest 10 `workflow_logs` for this workflow
- Latest 10 `workflow_runs` (per-step success/failed/skipped)
- Pending `scheduled_jobs` (for the delay nodes — the 10-day webinar flow has several)
- For the test lead: every `email_logs`, `lead_activities`, and current `tags` / `score`

This panel tells you exactly which step ran, which is queued, and which failed — with the error.

---

## What I'll build (when you approve)

### A. Diagnostics Panel on Workflow Editor
New button **"Diagnostics"** in the editor toolbar opens a side panel showing:

| Section | Source | Shows |
|---|---|---|
| Health | `workflows` row | status, last edited, trigger summary |
| Enrollments (24h) | `workflow_enrollments` | active / completed / exited / failed counts |
| Recent activity | `workflow_logs` (latest 20) | timestamp, event_type, lead, message |
| Step runs | `workflow_runs` (latest 20) | node label, status, error |
| Scheduled (delays) | `scheduled_jobs` where payload.workflow_id = this | run_at, lead, next node |
| Test a lead | input email → finds lead → shows their full timeline through this workflow |

### B. "Send Test Enrollment" action
Button that calls `enroll-workflow-leads` with `is_test=true` for a lead you pick. It runs the full graph in test mode (no real emails / SMS — they get marked `skipped: test_mode` per the engine's existing guard) so you can verify branching logic without burning credits or spamming your inbox.

### C. Per-node run badge on the canvas
Each node gets a small badge: `▶ 12 runs · 1 failed` pulled from `workflow_runs`. Failed nodes glow red. Click → see the error.

---

## Technical details

**Engine flow (already in place, confirmed by reading the code):**
- `fireAutomationsForLeads` → calls `enroll-workflow-leads` for every relevant event.
- `enroll-workflow-leads`:
  - filters `workflows` where `status='active'` and trigger node's `subType === event_type`
  - for `lead_added_to_folder` it also matches `cfg.folder_id === event_config.folder_id`
  - skips suppressed leads, skips if an `active` enrollment already exists (unless `enrollment_config.reEnrollment = true`)
  - inserts `workflow_enrollments` + `workflow_logs(event_type='enrolled')` then fire-and-forget invokes `execute-workflow`.
- `execute-workflow`:
  - walks `canvas_json` from current node, executes actions, evaluates conditions (`yes`/`no` handle routing), schedules delays into `scheduled_jobs`.
  - writes a `workflow_runs` row per step with `status` (`success` / `failed` / `skipped`) and `details/error`.
- `process-scheduled-jobs` (cron) picks up due `scheduled_jobs` and re-invokes `execute-workflow` with `start_from_node`.

**Diagnostics queries** (read-only, RLS-scoped):
```sql
select status, count(*) from workflow_enrollments
where workflow_id = $1 and started_at > now() - interval '24 hours'
group by status;

select * from workflow_logs where workflow_id = $1 order by created_at desc limit 20;
select * from workflow_runs  where workflow_id = $1 order by created_at desc limit 20;
select * from scheduled_jobs where payload->>'workflow_id' = $1::text and status='pending' order by run_at;
```

**Files to touch:**
- `src/pages/dashboard/WorkflowEditor.tsx` — add Diagnostics button + panel + node-level badges
- `src/components/workflows/DiagnosticsPanel.tsx` (new)
- `src/hooks/useWorkflows.ts` — add `useWorkflowDiagnostics(workflowId)` query
- `src/lib/workflows/testEnroll.ts` (new) — wraps `enroll-workflow-leads` invoke with `is_test=true`

No DB migrations or new edge functions required — all tables and the `is_test` flag already exist.

---

## What you can do *right now* without waiting for the build
1. Confirm the workflow card shows the **green "active"** badge on `/workflows`.
2. Open the workflow → click each condition node → verify YES/NO edges exist (gold/red).
3. Move a real test lead into the **Webinar – AI Sales Blueprint** folder.
4. Within ~30s, that lead should appear under the workflow's enrollments. If not, the trigger config doesn't match the folder_id — fix it in the trigger node and Save.

Approve and I'll switch to default mode and build the Diagnostics panel + Test Enrollment button + canvas run badges.


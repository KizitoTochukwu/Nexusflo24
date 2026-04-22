

## Goal
Build a HubSpot-grade **Workflow Automation Engine** for NexusFlo24 — a full-page visual builder with branching logic, enrollment rules, lead scoring, segmentation, and 10 prebuilt templates. Ships **alongside** the existing Automations engine (which keeps running unchanged).

## Where it lives
- New sidebar entry: **Workflows** (under `Automations`).
- Routes:
  - `/dashboard/:wid/workflows` — list + templates gallery
  - `/dashboard/:wid/workflows/new` — blank canvas
  - `/dashboard/:wid/workflows/:id` — editor (full-page, navy/gold themed)

## 1. Visual Builder (React Flow canvas)
Three-pane full-page editor:

```text
┌──────────────────────── Top bar ────────────────────────┐
│  ← Back   Workflow name [edit]   ● Status   [Test] [Save] [Publish] │
├──────┬────────────────────────────────────┬─────────────┤
│ Node │                                    │  Node       │
│ pal- │       Zoom/Pan canvas              │  settings   │
│ ette │   (React Flow w/ custom nodes)     │  (right     │
│      │   - Trigger node (gold, top)       │  panel)     │
│      │   - Action / Delay / Condition     │             │
│      │   - YES/NO handles on conditions   │             │
└──────┴────────────────────────────────────┴─────────────┘
```

- Custom node renderers for Trigger, Action, Delay, Condition, Branch-Merge, Goal, End.
- Conditions expose two source handles (`yes` / `no`) → curved navy connectors.
- Drag from palette → drop on canvas → auto-link to nearest node.
- Mini-map, zoom controls, fit-to-view, undo/redo (50 steps).
- Validation gutters: red ring on misconfigured nodes; publish blocked until clean.

## 2. Node Library (full coverage)

**Triggers** — New lead, Lead added to folder, Lead tagged, Tag added (any), Score threshold, Email opened, Email NOT opened after X, Link clicked, WhatsApp replied, SMS replied, Campaign completed, Form submitted, Funnel step completed, Purchase event, Appointment booked, Trial started, Trial ending soon, Subscription cancelled.

**Actions** — Send Email / SMS / WhatsApp, Wait/Delay, Add tag, Remove tag, Update status, Update lifecycle stage, Update pipeline stage, Increase score (+N), Decrease score (-N), Assign owner (round-robin or specific), Create task, Move to folder, Add note, Notify team (in-app + email), Webhook POST, Stop workflow, Jump to step.

**Logic** — All If/Then conditions listed in the brief, plus an **AND/OR criteria group builder** inside each condition node (e.g. `(score > 50 OR has tag "hot") AND source = "Funnel"`).

## 3. Branching & merge
- Every condition node has independent **YES** and **NO** sub-trees that can each contain unlimited nested actions, delays, and further conditions.
- Optional **Merge** node to rejoin branches before continuing.
- Optional **Goal** node — when reached, lead exits workflow successfully (tracked in analytics).

## 4. Enrollment rules (per workflow)
Right-panel "Enrollment" tab:
- **Re-enrollment**: off / on (with criteria — e.g. re-enroll when "form submitted" fires again).
- **Suppression list**: tags, lifecycle stages, or smart list — leads matching are never enrolled.
- **Unenrollment triggers**: events that immediately remove lead from the flow (e.g. "purchase made" removes from nurture).
- **Quiet hours / sending window**: block sends outside business hours per workspace timezone.

## 5. Delays
- Wait N minutes/hours/days/weeks
- Wait until specific weekday + time
- Wait until property date (e.g. trial end date, appointment date) ± offset
- Wait until condition met (polled hourly, max N days)

All scheduled via the existing `scheduled_jobs` table + `process-scheduled-jobs` cron.

## 6. Personalization
- Merge fields: `{{first_name}}`, `{{full_name}}`, `{{email}}`, `{{phone}}`, `{{source}}`, `{{status}}`, `{{score}}`, `{{company}}`, `{{owner_name}}`, `{{lead_status}}`, `{{last_activity_date}}`, plus all link tokens already supported.
- **Fallback syntax**: `{{first_name|there}}` renders "there" when first_name is empty. Resolved server-side in the executor.

## 7. Lead scoring
- Score actions wired into the executor (increase/decrease N, set absolute value).
- The existing `update_lead_score_on_activity` trigger continues to drive automatic event-based scoring; workflows layer on manual score deltas.
- New `lead_score_history` table records every change (source, delta, before/after, timestamp) — surfaced as a sparkline in the lead drawer.

## 8. Auto-segmentation (built into workflow nodes)
Common segmentation patterns ship as one-click presets in the action library:
"Tag as engaged", "Tag as high-intent", "Tag as cold-lead", "Tag as customer", etc. — they expand to `add_tag` actions with the right tag name.

## 9. Templates gallery
On `/workflows`, a **Templates** tab shows 10 cards. Clicking "Use template" creates a new workflow with the canvas pre-populated and connectors pre-wired:

1. **AI Sales System – Master Workflow** (the full 14-step flow from the brief)
2. Welcome New Lead
3. Lead Magnet Nurture
4. Webinar Registration Follow-up
5. High-Intent Sales Follow-up
6. Free Trial Activation
7. Trial Expiry Conversion
8. Customer Onboarding
9. Re-engagement
10. Win-back

Each template is stored as JSON in `workflow_templates` and seeded via migration.

## 10. Database (new tables, leaves old `automations` untouched)

```text
workflows                – id, workspace_id, name, description, status (draft/active/paused/archived),
                           canvas_json (React Flow nodes+edges), enrollment_config, suppression_config,
                           goal_node_id, created_at, updated_at, version
workflow_nodes           – normalized view of canvas nodes for executor (id, workflow_id, type,
                           config, parent_id, branch ('main'|'yes'|'no'), order)
workflow_enrollments     – workflow_id, lead_id, status (active/completed/exited/suppressed),
                           current_node_id, branch_path[], started_at, completed_at, exit_reason
workflow_runs            – per-step execution row: enrollment_id, node_id, status, details, ran_at
workflow_logs            – aggregate event log (per workflow, for analytics)
workflow_templates       – id, slug, name, category, description, canvas_json, is_featured
lead_score_history       – lead_id, delta, new_score, source ('workflow'|'event'|'manual'), ref_id, at
```

All tables get workspace-scoped RLS using existing `user_workspace_ids(auth.uid())` pattern. `workflow_runs` is service-role insert only.

## 11. Execution engine
New edge function **`execute-workflow`** (separate from `execute-automation`) that:
- Resolves the next node from the enrollment's `current_node_id`.
- Evaluates condition nodes against live lead data → picks `yes` or `no` edge.
- Runs actions (re-using existing message senders, credit guard, throttle).
- Schedules delays in `scheduled_jobs` keyed by `enrollment_id` + `next_node_id`.
- Honors suppression, quiet hours, unsubscribe tags, max-execution safeguards (hard cap 500 steps per enrollment).
- Writes per-step `workflow_runs` row + appends to `workflow_logs`.

A second function **`enroll-workflow-leads`** is invoked when a trigger fires (folder add, tag add, score threshold, etc.) and:
- Checks suppression / unenrollment / re-enrollment rules.
- Creates a `workflow_enrollments` row.
- Invokes `execute-workflow` to start.

Triggers wired from existing call sites (CSV import, capture-lead, useLeads tag updates, lead activity score writes) — same pattern as the recently added `fireAutomationsForLeads`.

## 12. Test mode
Top-bar "Test" button:
- Pick any existing lead → runs the workflow in **dry-run mode** (no real sends, no DB writes beyond `workflow_runs` rows tagged `test=true`).
- Shows live trace overlay on canvas: each visited node lights up gold; skipped nodes dim.

## 13. Analytics tab (per workflow)
Inside each workflow, an **Analytics** tab shows:
- Total enrolled / active / completed / exited (suppressed, unsubscribed, goal-reached)
- Drop-off funnel by node
- Per-branch conversion (% of leads taking YES vs NO at each condition)
- Email open/click rates aggregated from `email_logs` joined to `workflow_runs`
- Revenue influenced (sum of `purchase_event` values for enrolled leads, when present)
- CSV export

A new entry on the existing global **Analytics** page surfaces top-performing workflows.

## 14. Safety & ops
- Publish validation: every path must terminate, no orphan nodes, all required configs filled, sender channels configured.
- Pause/Archive: pausing freezes pending `scheduled_jobs` for that workflow; archiving hides from lists, retains analytics.
- Duplicate-protection: existing dedup pattern (`scheduled_jobs` + `enrollments` unique on workflow+lead+active) prevents double-enrollment.
- Per-workflow daily send cap (configurable).
- Failed step → log error, retry once, then mark enrollment `errored` and notify workspace admin.

## Files to create / change

**New (frontend)**
- `src/pages/dashboard/DashboardWorkflows.tsx` — list + templates gallery
- `src/pages/dashboard/WorkflowEditor.tsx` — full-page editor shell
- `src/components/workflows/canvas/WorkflowCanvas.tsx` — React Flow wrapper
- `src/components/workflows/canvas/nodes/{Trigger,Action,Condition,Delay,Merge,Goal}Node.tsx`
- `src/components/workflows/palette/NodePalette.tsx`
- `src/components/workflows/inspector/NodeInspector.tsx` — right panel
- `src/components/workflows/inspector/EnrollmentSettings.tsx`
- `src/components/workflows/inspector/CriteriaGroupBuilder.tsx` — AND/OR groups
- `src/components/workflows/templates/TemplateGallery.tsx`
- `src/components/workflows/analytics/WorkflowAnalytics.tsx`
- `src/components/workflows/TestRunDialog.tsx`
- `src/hooks/useWorkflows.ts`, `useWorkflowEnrollments.ts`, `useWorkflowAnalytics.ts`
- `src/lib/workflows/canvasSerializer.ts`, `validation.ts`, `templateSeeds.ts`

**New (backend)**
- `supabase/functions/execute-workflow/index.ts`
- `supabase/functions/enroll-workflow-leads/index.ts`
- Migration: 7 new tables + RLS + indexes
- Migration: seed `workflow_templates` with 10 entries (canvas JSON)

**Touched**
- `src/components/dashboard/DashboardLayout.tsx` — add "Workflows" nav item
- `src/App.tsx` — register the 3 routes
- `src/lib/automations/fireTriggers.ts` — also call `enroll-workflow-leads` so the same trigger event drives both engines
- `supabase/functions/process-scheduled-jobs/index.ts` — handle `workflow_id` payloads alongside existing `automation_id`
- New deps: `reactflow`, `@xyflow/react`

## Out of scope (v1)
- A/B split-test branches (placeholder node, executes "A" arm only — wired in v2)
- Visual revision history beyond `version` counter
- Workflow-to-workflow "jump" across different workflows (in-flow `Jump` only)


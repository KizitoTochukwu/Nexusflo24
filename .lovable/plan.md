## Goal

Add a **History** tab to the Automation Details drawer that lists every run of the automation as a flat, sortable table — complementing Timeline (branch view per lead), Logs (raw events), and Health (current state).

Tabs after change: **Overview · Timeline · History · Health · Logs**.

## Columns

| Column | Source |
|---|---|
| Lead | `leads.full_name` / email fallback (resolved via existing `leadLabelFor`) |
| Started | First `automation_logs.created_at` in the run |
| Trigger | Derived: `payload.source` from the originating `scheduled_jobs` row (folder_trigger, tag_added, score_reached, manual, re-trigger, form_submit, webhook…) with a friendly label + icon |
| Steps | `X / Y` — executed step events vs total steps in `automation.steps` (e.g. `4 / 7`) with a thin progress bar |
| Status | Rollup: **Completed** (last log success and no pending job) · **Running** (open scheduled_job pending/running) · **Failed** (any failed log/job) · **Exited** (cancelled/exit-criteria) · **Out of credits** (`insufficient_credits`) |
| Duration | First → last log delta, formatted (`2m 14s`, `1h 03m`, `—` if running) |
| Actions | Row menu: View timeline (jumps to Timeline tab, auto-expands this run) · Re-trigger (failed/exited only) · Cancel pending (running only) · Open lead drawer |

## UX details

- Newest first, default sort by Started desc. Column headers sortable for Started, Duration, Status.
- Filters above the table: Status (all/completed/running/failed/exited), Trigger (all + list of distinct triggers seen), search by lead name/email.
- Empty state mirrors Timeline's tone: "No runs yet. When a lead enters this automation, each run will appear here."
- Status uses the same color tokens already in `ExecutionTimeline` (emerald / blue / red / rose / amber).
- Row click = expand inline mini-timeline (reuses the existing `ExecutionTimeline` `layoutRows` helper for that single run) so users don't need to leave the tab for common drill-downs; "View full timeline" link in the expanded panel switches tabs.
- Pagination: 25 rows per page, "Load more" button.

## Implementation

**New file:** `src/components/automations/ExecutionHistoryTable.tsx`
- Props: `logs: AutomationLog[]`, `jobs: ScheduledJob[]`, `stepsCount: number`, `leadLabelFor`, `onOpenTimeline(runKey)`, `onReTrigger(run)`, `onCancel(run)`, `onOpenLead(leadId)`.
- Reuses the `groupByRun` logic already in `ExecutionTimeline.tsx` — extract it to a small shared helper `src/components/automations/runGrouping.ts` and import from both files (no behavior change for Timeline).
- Adds a `summarizeRun(entries, jobs)` helper that returns `{ status, duration, executedSteps, trigger }`. Trigger label resolution order: explicit `payload.source` → first log's `event_type` → `"manual"`.
- Uses shadcn `Table`, `Badge`, `DropdownMenu`, `Button`, and existing status color map from Timeline.

**Edited:** `src/components/automations/AutomationDetailsDrawer.tsx`
- Add a `"history"` value to the existing tabs list and render `<ExecutionHistoryTable />` inside it.
- Pass the already-fetched `logs`, `scheduled_jobs`, and `automation.steps?.length ?? 0` down. No new queries needed — the drawer already loads these.
- Wire `onOpenTimeline(runKey)` to set the active tab to `"timeline"` and pre-open that run (extend `ExecutionTimeline` to accept an optional `initiallyOpenRunKey` prop).
- Wire `onReTrigger` to the same `supabase.functions.invoke("execute-automation", { start_from_step })` pattern used by the new Health-tab "Re-trigger all stuck" action.
- Wire `onCancel` to update `scheduled_jobs.status = 'cancelled'` for pending jobs of that lead+automation.

**Edited:** `src/components/automations/ExecutionTimeline.tsx`
- Replace inlined `groupByRun` / `toRun` / `layoutRows` with imports from the new `runGrouping.ts`.
- Accept optional `initiallyOpenRunKey` to auto-expand a specific run when navigated from History.

No DB migrations, no edge function changes, no new RLS — purely a presentation layer addition on top of data already in scope.

## Out of scope (explicitly not added)

- Run name / synthetic Run ID column
- Source run / parent-run column (no sub-automation chaining today)
- Last activity column (covered by inline expanded timeline)
- CSV export of runs (can be added later if requested)

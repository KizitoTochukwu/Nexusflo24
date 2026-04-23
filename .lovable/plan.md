

## Why your workflow appears not to fire (it actually does — then dies silently)

I traced your real run end-to-end. The trigger DID fire. Here's exactly what happened to the lead "Kizito Tochukwu" you added to the **Webinar – AI Sales Blueprint** folder:

```text
23:51:32  Lead added to folder                             ✅
23:51:34  enroll-workflow-leads → enrollment created        ✅  (workflow_logs: "enrolled")
23:51:35  Step a1 (send_email)        recorded as success   ⚠️  but NO email_logs row exists
23:51:36  Step d1 (1-day delay)       recorded as success   ⚠️  but NO scheduled_jobs row created
          → Enrollment stuck at c1 forever, never resumes   ❌
```

So you saw "no trigger" because nothing visible happened — no email landed, no follow-up scheduled. But the engine ran and **silently failed** at two layers.

## Two real bugs in the engine (not config issues)

### Bug 1 — `scheduled_jobs.automation_id` has a FK to `automations` table, blocking ALL workflow delays

The workflow engine reuses the `scheduled_jobs.automation_id` column to store the workflow id. But the column has this constraint:

```text
scheduled_jobs_automation_id_fkey  FOREIGN KEY (automation_id) REFERENCES automations(id)
```

Workflow ids live in `workflows`, not `automations`. So every delay-resume job insert fails with `violates foreign key constraint`. I reproduced this with a direct insert — confirmed.

The engine code (`execute-workflow/index.ts` line 352) does NOT check the insert error, so the failure is swallowed and the lead is stranded. **Every workflow with a delay node is broken right now** — only the action(s) before the first delay run.

### Bug 2 — `send_email` action is fire-and-forget with `.catch(() => {})`

Line 155: `email-send` is invoked via raw `fetch` with `.catch(() => {})`. Any failure (provider down, throttled, bad payload) is silently dropped, and `workflow_runs` is still written as `success`. Your `email_logs` table has zero rows for the test lead — the email never sent, but the engine claims it did.

## The fix

### A. Schema migration — make `scheduled_jobs` workflow-safe
- Drop the `scheduled_jobs_automation_id_fkey` FK (it's wrong for the dual-purpose column).
- Make `automation_id` nullable so workflow jobs don't need a fake id.
- Add an index on `(payload->>'workflow_id', status, run_at)` for fast workflow-job lookups (used by Diagnostics → Queue).
- Backfill: re-insert the missing scheduled job for the stranded enrollment so your test lead resumes immediately.

### B. `execute-workflow` engine hardening
- Check the `scheduled_jobs` insert error. On failure: write a `workflow_runs` row with `status='failed'` and a `workflow_logs` row with the error, and mark the enrollment `status='failed'` so it shows in Diagnostics instead of disappearing.
- For `send_email` / `send_sms` / `send_whatsapp`: `await` the response, parse the result, and if the provider returns non-2xx, mark the run `failed` (not `success`) and log the provider error.
- Add a top-level `try/catch` per node so one bad node logs an error instead of killing the loop.

### C. `enroll-workflow-leads` visibility
- When a workflow has 0 matching active workflows for an event, write a `workflow_logs` row at workspace level (`event_type='no_match'`, with the event_type + folder_id) so the Diagnostics panel shows "trigger fired but no workflow matched" instead of looking dead.

### D. Diagnostics panel — surface stranded enrollments
- Add a **Stranded** badge in the Overview tab: enrollments with `status='active'` whose `last_step_at` is older than the longest delay in the canvas AND have no pending `scheduled_jobs` row. One click → "Resume now" button that re-invokes `execute-workflow` with `start_from_node=current_node_id`.
- Add a **Resend last failed** button on each failed `workflow_runs` row.

### E. Manual recovery for the existing stuck lead
After the migration runs, immediately:
1. Insert the missing scheduled_jobs row for enrollment `5f5c8831…` to resume at `c1` now.
2. Add a `workflow_logs` entry explaining the recovery.

## Files I'll touch

| File | Change |
|---|---|
| `supabase/migrations/<new>.sql` | Drop bad FK, allow nullable `automation_id`, add index, backfill stuck enrollment |
| `supabase/functions/execute-workflow/index.ts` | Error-check scheduled_jobs insert, await + verify message sends, per-node try/catch, write failure logs |
| `supabase/functions/enroll-workflow-leads/index.ts` | Log "no_match" diagnostic event when trigger fires but no workflow matches |
| `src/components/workflows/DiagnosticsPanel.tsx` | Add "Stranded enrollments" section + "Resume now" + "Retry failed step" buttons |
| `src/hooks/useWorkflows.ts` | Add `useResumeEnrollment(enrollmentId, fromNodeId)` mutation |

## What you should expect after this ships
1. The stuck Webinar lead resumes within seconds (delay was 1 day → it's already overdue, so c1 fires immediately).
2. You'll see **either** an email actually delivered to `kizzyadichie@gmail.com` **or** a clear failure row in Diagnostics → Step Runs explaining why (e.g. Resend quota, domain not verified, etc.).
3. Future workflows with delays will properly schedule and resume via the existing `process-scheduled-jobs` cron.
4. Diagnostics will surface any future stranded enrollments instead of you having to ask why nothing happened.

Approve and I'll switch to default mode and ship the migration + engine fixes + Diagnostics upgrades in one pass.

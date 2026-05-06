## Confirmed root cause

For automation `33055318-…`:
- `automation_logs` shows `delay:execute → scheduled` at step_index 3, scheduled for 2026-05-05.
- `scheduled_jobs` table contains **zero rows** for that automation.
- Every following step is logged as `skipped` ("Skipped due to earlier condition or delay").

The current `execute-automation` code does:
```ts
await supabase.from("scheduled_jobs").insert({...});
status = "scheduled";
skipRemaining = true;
```
It **never checks the insert result**. When the insert silently fails (RLS, payload type mismatch, etc.), the function still logs `scheduled`, sets `skipRemaining = true`, and the rest of the sequence is killed. No job ever exists for `process-scheduled-jobs` to pick up — so the lead receives email 1, then nothing.

This is the actual bug behind "first email fires, sequence stops".

## Fix plan

### 1. Bullet-proof delay-job insertion (`supabase/functions/execute-automation/index.ts`)
Replace the silent insert in the `case "delay"` block:
- Validate `automation_id`, `lead_id`, `workspace_id` are non-null UUIDs before inserting.
- Capture insert result with `.select("id").maybeSingle()` and check both `error` and that a row came back.
- On failure: do NOT set `skipRemaining = true`. Instead log `delay:error` to `automation_logs` with the raw Supabase error, and **continue** the for-loop (so the next step still has a chance to run rather than the whole sequence dying).
- One automatic retry of the insert (with a 200ms backoff) before giving up.

### 2. Self-healing recovery (`supabase/functions/automations-recover/index.ts` — NEW)
Cron'd every 5 minutes. Scans `automation_logs` for entries where:
- `event_type = 'delay:execute'`, `status = 'scheduled'`, `created_at > now() - 24h`
- AND no matching row exists in `scheduled_jobs` (same automation_id + lead_id + step_index from `details`)

For each orphan, re-insert the missing scheduled job using `details.scheduled_run_at` and `details.next_step_index`. Log a `delay:recovered` event for visibility.

Also schedule via pg_cron alongside `process-scheduled-jobs`.

### 3. Stop double-enrollment between legacy + workflows (`src/lib/automations/fireTriggers.ts`)
Today every trigger fires BOTH `execute-automation` (legacy) AND `enroll-workflow-leads` (new). When both engines are active for the same lead, one tramples the other's state. Change to:
- If any active **legacy automation** matches the trigger → only call `execute-automation`.
- Else → only call `enroll-workflow-leads`.

User can still author both, but we never run both for the same lead in the same trigger.

### 4. Don't let credit/contact failures break the chain
In `execute-automation`, the `insufficient_credits` and "Lead has no email/phone" branches already `break` out of the switch (correct), but we should also confirm `skipRemaining` stays `false` so subsequent delays + other-channel steps still run. Audit this path and add a unit-style log line `step:continued_after_error` for transparency.

### 5. Sequence Health panel (`src/components/automations/AutomationDetailsDrawer.tsx`)
Add a small panel listing currently-enrolled leads with:
- Last completed step
- Next scheduled step + run_at (from `scheduled_jobs`)
- A "Re-trigger" button that calls `execute-automation` with `start_from_step` set to the next step index

Lets the user instantly see "is this lead actually queued?" and recover stuck ones in one click.

### 6. DB index for scheduled_jobs lookups
Migration adds:
```sql
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_automation_lead_status
  ON public.scheduled_jobs (automation_id, lead_id, status);
```
Speeds up the dedup checks in execute-automation and the recovery scan.

### 7. Operational cleanup (one-time SQL via migration)
- Mark all `failed` `campaign_fallback` jobs older than 7 days as `archived` so the dashboard isn't noisy.
- Re-queue any orphaned automations from the last 24h (one-shot version of step 2's recovery).

## Files touched

- `supabase/functions/execute-automation/index.ts` — harden delay insert, capture errors, don't kill chain
- `supabase/functions/automations-recover/index.ts` — NEW
- `src/lib/automations/fireTriggers.ts` — exclusive dispatch
- `src/components/automations/AutomationDetailsDrawer.tsx` — Sequence Health panel
- New migration: index + cron schedule for `automations-recover` + one-shot cleanup
- `supabase/config.toml` — register new function (verify_jwt = false)

## Verification

After deploy, I'll:
1. Manually re-trigger automation `33055318-…` for a test lead.
2. Confirm `scheduled_jobs` gets a row with `step_index = 3`.
3. Wait for the cron tick (or manually invoke `process-scheduled-jobs`) and confirm step 3 fires.
4. Check `automation_logs` shows the full chain: send_email → add_tag → delay:scheduled → (1 day later) send_email → delay:scheduled → ...

No data is destroyed by any of these changes; orphaned logs from past runs stay as-is, but new runs will be reliable and old stuck runs will be recovered.

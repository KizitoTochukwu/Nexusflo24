# Forms Pipeline — Cleanup & Verification

## Part A — Backfill (one-time data fix)

**Scope identified:** 3 leads have duplicate `form_submit` activities (5 extra rows total) created before the `capture-lead` patch.

| Lead ID | Duplicate rows to delete |
|---|---|
| 6e4d7d9a-ea15-48f0-b27a-34ad632c21ff (Adedayo) | 1 |
| 675df493-7c16-41d0-933d-29fa62bd2720 (Kizito) | 2 |
| 50c0906e-da85-4fa6-a15a-01e0403fcfd0 | 2 |

**Steps (executed via insert/data tool):**

1. **Dedupe activities** — keep the earliest row per `(lead_id, second-bucket)` and delete duplicates:
   ```sql
   DELETE FROM lead_activities
   WHERE id IN (
     SELECT id FROM (
       SELECT id, ROW_NUMBER() OVER (
         PARTITION BY lead_id, type, date_trunc('second', created_at)
         ORDER BY created_at
       ) AS rn
       FROM lead_activities
       WHERE type = 'form_submit'
     ) t WHERE rn > 1
   );
   ```

2. **Recalculate scores** for the 3 affected leads from scratch using the same delta table the trigger uses (form_submit=10, email_open=5, link_click=10, lead_magnet_download=20, website_visit=5, pricing_page_visit=25, webinar_registration=30, call_booking=50, email_unsubscribe=-50). Update `score` and re-derive `status` (Hot ≥81, Warm ≥21, else New).

3. **Verify** post-backfill: query the same three leads to confirm one `form_submit` per submission and corrected scores.

## Part B — Live end-to-end test

After backfill, submit a real entry through the public form to confirm the patched function writes exactly one activity:

1. Open `https://nexusflo24.com/forms/webinar-c16e15` in a new tab
2. Fill with a test entry (e.g., name "QA Test", unique email like `qa+{timestamp}@nexusflo24.com`, phone)
3. Submit
4. I'll then query and confirm:
   - 1 new row in `form_submissions`
   - 1 new lead (or merged into existing by email)
   - **Exactly 1** `form_submit` activity for that lead
   - Score increment of exactly **+10** from the form submission
   - Tag, source, and pipeline_stage applied per form settings
   - `notify-form-submission` invoked successfully

## Technical notes

- All operations are non-destructive to lead records themselves (only duplicate activity rows removed; scores recomputed from authoritative activity history).
- No schema changes — pure data backfill via the data tool.
- The `update_lead_score_on_activity` trigger will not re-fire on DELETE, so manual UPDATE of `score`/`status` is required.

## Deliverable

A short report after Part B with the 4 verification checks above marked ✅/❌, confirming the duplicate-activity bug is fully closed.

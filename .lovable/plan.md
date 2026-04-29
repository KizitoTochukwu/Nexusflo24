## Problem

The form's "X submissions" counter on the Forms list never increments. Two root causes:

1. **`capture-lead` edge function never writes to `form_submissions`.** When a public form posts to `capture-lead` with a `form_id`, the function creates/updates the lead but never inserts a corresponding row in the `form_submissions` table.
2. **Nothing increments `forms.submission_count`.** A codebase search confirms no edge function, hook, or DB trigger updates that column.

Net result: even successful submissions (CRM-mapped lead created, folder routed) leave the counter stuck at 0.

## Fix

### 1. Update `capture-lead` edge function
After the lead is created/updated, if the payload includes a `form_id`:
- Insert a row into `form_submissions` (`form_id`, `workspace_id`, `lead_id`, `data` = the original submitted field values).
- Use service role (already in use) so it bypasses RLS.

### 2. Add a DB trigger to keep the counter in sync
Create a trigger on `form_submissions` that increments `forms.submission_count` on INSERT and decrements it on DELETE. This makes the counter authoritative and self-healing regardless of which code path inserts the submission.

```sql
create or replace function public.bump_form_submission_count()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op = 'INSERT' then
    update public.forms set submission_count = submission_count + 1, updated_at = now()
    where id = NEW.form_id;
  elsif tg_op = 'DELETE' then
    update public.forms set submission_count = greatest(0, submission_count - 1), updated_at = now()
    where id = OLD.form_id;
  end if;
  return null;
end $$;

create trigger trg_form_submissions_count
after insert or delete on public.form_submissions
for each row execute function public.bump_form_submission_count();
```

### 3. Backfill existing counts
One-time `UPDATE forms SET submission_count = (SELECT count(*) FROM form_submissions WHERE form_id = forms.id)` to reconcile any historical leads.

### 4. Verify
Submit the live `ddd` form once via the public URL and confirm:
- a row appears in `form_submissions`
- `forms.submission_count` becomes 1
- the Forms list UI shows "1 submissions"

## Files / changes

- `supabase/functions/capture-lead/index.ts` — insert into `form_submissions` when `form_id` is present
- New migration — trigger + backfill
- Redeploy `capture-lead`

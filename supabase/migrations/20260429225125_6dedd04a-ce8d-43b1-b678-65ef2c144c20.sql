create or replace function public.bump_form_submission_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.forms
      set submission_count = coalesce(submission_count, 0) + 1,
          updated_at = now()
    where id = NEW.form_id;
    return NEW;
  elsif tg_op = 'DELETE' then
    update public.forms
      set submission_count = greatest(0, coalesce(submission_count, 0) - 1),
          updated_at = now()
    where id = OLD.form_id;
    return OLD;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_form_submissions_count on public.form_submissions;
create trigger trg_form_submissions_count
after insert or delete on public.form_submissions
for each row execute function public.bump_form_submission_count();

-- Backfill existing counts to reconcile any historical data
update public.forms f
set submission_count = sub.cnt
from (
  select form_id, count(*)::int as cnt
  from public.form_submissions
  group by form_id
) sub
where f.id = sub.form_id;
# Lead scoring: close the remaining gaps

I checked the live setup end to end. The scoring maths is wired correctly, but two real blockages remain, so the answer is: not fully working yet.

## What is already correct

- Points are read from your saved settings whenever an activity is recorded, falling back to the old built-in values when a workspace has never saved anything.
- Hot / Warm thresholds come from your saved bands, and the Hot-lead alert still fires on entry into the top band.
- Decay reads your window, points and on/off switch per workspace.
- Only owners/admins can save; all members can read.

## Gap 1 — Saving and loading is blocked (critical)

The settings table has security rules but no access privileges granted, so the app cannot read or write it at all. In practice the Lead Scoring page will fail with a permission error on load and on save, and every workspace silently stays on the built-in defaults.

Fix: grant read to members and read/write to the app, plus full access for background jobs.

## Gap 2 — Decay never actually runs

The decay routine exists and respects your settings, but nothing calls it. No scheduled task runs it, so leads never lose points for inactivity regardless of what you set.

Fix: schedule it to run once a day.

## Gap 3 — Custom activities need a way to be recorded

Custom rules (e.g. "Quote requested") score correctly once an activity with that name is logged, but nothing in the app logs them yet. I will add the custom activity names to the "Log activity" picker on a lead so they can be used straight away.

## Technical notes

- Migration: `GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_scoring_settings TO authenticated; GRANT ALL ... TO service_role;` (no `anon`, all policies are auth-scoped).
- Migration: `cron.schedule('decay-inactive-leads', '20 3 * * *', $$SELECT public.decay_inactive_leads();$$)`.
- Lead activity logging UI: merge `custom_labels` keys from `lead_scoring_settings` into the activity type options used by `useLogActivity`.
- After the grants, verify by saving settings from the page and confirming a row lands in `lead_scoring_settings`, then insert a test activity and confirm the lead score moves by the configured amount.

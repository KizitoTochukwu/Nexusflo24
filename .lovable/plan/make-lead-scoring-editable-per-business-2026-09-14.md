# Make lead scoring editable per business

You're right. Today the Lead Scoring page is read-only: the points (form submission +10, call booking +50, unsubscribe −50), the Hot/Warm/New bands (81–100 / 21–80 / 0–20) and the decay rule (−20 points after 30 days) are fixed in the system for every workspace. A coach booking discovery calls and a shop selling products should not weight the same actions the same way.

## What changes

**1. Editable scoring rules**
Every activity point value becomes editable per workspace: change the number, set it to 0 to switch an activity off, or use negative values for disengagement. Reset-to-default is always available.

**2. Editable status bands**
Set your own Hot / Warm / New thresholds instead of the fixed 81 / 21. Overlapping or invalid ranges are blocked with a clear message.

**3. Editable decay**
Choose the inactivity window (e.g. 14, 30, 60, 90 days), how many points are lost, or turn decay off completely.

**4. Business-type presets**
One-tap starting points that fill in sensible values, then you can fine-tune:
- Coaching & consulting — call bookings and webinar signups weigh heaviest
- E-commerce — pricing/product page visits and checkout activity weigh heaviest
- Agency / B2B services — form submissions, lead magnets and proposal engagement
- Events & webinars — registration and attendance dominate
- Local services — call bookings and enquiry forms dominate

**5. Custom activities**
Add your own named scoring rule (e.g. "Quote requested", "Attended demo") so scoring matches how your business actually qualifies people.

Existing leads keep their current scores; new activity is scored with your settings from the moment you save.

## Technical notes

- New table `public.lead_scoring_settings` (one row per workspace): `rules jsonb`, `bands jsonb`, `decay jsonb`, timestamps. GRANTs + RLS scoped with `is_workspace_member` / `is_workspace_admin` (read for members, write for admins).
- `update_lead_score_on_activity()` rewritten to look up the lead's workspace settings and read the delta from `rules`, falling back to the current hardcoded defaults when no row exists — so every workspace without settings behaves exactly as it does now.
- Band assignment moves from the hardcoded CASE to the stored thresholds; the Hot-lead notification still fires on entry into the configured top band.
- `decay_inactive_leads()` reads per-workspace window/points and skips workspaces with decay disabled.
- Custom activities are stored as extra keys in `rules`; the activity `type` string is matched against them.
- `DashboardLeadScoring.tsx` becomes a form (editable rows, band inputs, decay controls, preset selector, Save / Reset) backed by a `useLeadScoringSettings` hook with optimistic save and toasts.

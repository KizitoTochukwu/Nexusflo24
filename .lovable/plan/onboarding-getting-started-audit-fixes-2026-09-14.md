# Onboarding & Getting Started: audit + fixes

## How it works today

**Onboarding wizard** (`/onboarding`, also inside Settings → Onboarding): 11 steps saved to a
`user_onboarding` record per user + workspace. New accounts (under 3 days old, no record) are sent
there automatically; everyone else goes straight to the dashboard. Finishing marks it complete and
opens the dashboard, which then auto-plays the product tour once.

**Getting Started checklist**: 9 items on the dashboard overview. Most items check real data
(leads, imported leads, sender profiles, calendar token, invites/members, automations, campaigns,
booking pages). It can be minimised or dismissed, and both states are remembered.

## What is genuinely broken

1. **Pipeline stages go nowhere.** The stages typed in the wizard's pipeline step are saved only as
   answers; no pipeline or stages are ever created in the CRM. The checklist's "Create your pipeline"
   likewise only reads the wizard's self-declared checkbox, so it shows incomplete even when the
   workspace already has a pipeline (and can show complete when it has none).
2. **Four steps are honour-system.** Import contacts, connect email, connect calendar and invite team
   rely on a "mark as done" tick in the wizard, while the checklist checks real data. The two can
   disagree, which is why an item can look done in one place and not the other.
3. **Checklist is always on.** It occupies the top of the dashboard on every visit until dismissed.

## Changes

### 1. Make the pipeline step real
- On finishing the wizard, create the workspace pipeline and its stages from the entered names if the
  workspace has no pipeline yet; if one exists, leave it untouched and just record it as configured.
- Change the checklist's "Create your pipeline" to check for an actual pipeline with stages in the
  workspace, falling back to the saved answer.

### 2. Align the honour-system steps with real data
- In the wizard, show live status for import contacts / email / calendar / team using the same checks
  the checklist uses, so a step marks itself done when the real thing exists. The manual tick stays as
  a fallback for people who did it elsewhere.
- Fix step links so they navigate in the same tab where that makes sense, and point "Add your first
  contact" and "Import contacts" at the leads page with the importer intent.

### 3. Only prompt when unfinished, don't camp on the dashboard
New behaviour on the dashboard overview:
- If everything is complete, or the user dismissed it, nothing shows.
- If unfinished, show a single slim prompt bar instead of the full list: rocket icon, "Finish setting
  up — 3 of 9 done", a thin progress bar, a "Continue setup" button and a dismiss X.
- Clicking it expands the full checklist inline (same content as today); collapsing returns to the
  slim bar. Expanded/collapsed is remembered per user in the existing record.
- The prompt auto-hides after dismissal and stays reachable from the help menu and Settings →
  Onboarding, which already fire the reopen event.

## Technical notes
- Files: `src/hooks/useOnboarding.ts` (pipeline check, shared status), `src/components/onboarding/OnboardingWizard.tsx`
  (pipeline creation on finish, live step status), `src/components/dashboard/GettingStartedChecklist.tsx`
  (prompt-bar vs expanded rendering), `src/pages/Dashboard.tsx` (unchanged mount point).
- Pipeline creation reuses the existing `crm_pipelines` / `crm_pipeline_stages` tables and the current
  workspace-scoped insert patterns; no schema or policy changes.
- Existing `checklist_minimized` / `checklist_dismissed` columns drive the new collapsed state — no
  migration needed.
- Verify in the browser: fresh dashboard shows the slim bar, expanding shows all 9 items, dismissing
  hides it, reopening from Settings → Onboarding brings it back, and a wizard run creates a real
  pipeline.

## Port the enrollment-trigger UX into the Automations module

Mirror the changes already shipped in Workflows onto Automations so both modules use the same object → source → event → scope → filters model. No redesign of the step editor — only the trigger area.

### 1. Database migration — extend `public.automations`

Add the same columns already on `workflows`, nullable, so legacy rows keep working:

- `enrollment_object_type` text default `'lead'`
- `enrollment_method` text default `'event'`
- `trigger_source` text
- `trigger_event` text
- `trigger_config` — already exists (jsonb); reused for scope field values
- `filter_groups` jsonb default `'[]'::jsonb`
- `reenrollment_config` jsonb default `'{"mode":"never"}'::jsonb`
- `deduplication_key` text
- `trigger_summary` text
- `last_tested_at` timestamptz
- `folder_id` uuid (nullable, for grouping)

Backfill mapping from existing `trigger_type` (never remap `campaign_completed` → `meta_lead_received`):

```text
new_lead              → crm  / new_lead
lead_added_to_folder  → crm  / lead_added_to_folder
lead_tagged           → crm  / lead_tagged
score_threshold       → crm  / score_threshold
form_submitted        → forms / form_submitted
campaign_completed    → campaigns / campaign_completed
appointment_booked    → bookings / appointment_booked
```

RLS: no new table — reuse existing workspace-scoped policies on `automations`. No new GRANTs needed.

### 2. Frontend — replace the legacy trigger UI on both surfaces

**`CreateAutomationDialog.tsx`** and **`AutomationDetailsDrawer.tsx`**:

- Remove the "Trigger" `<Select>` fed by `TRIGGER_OPTIONS`.
- Remove the "Scope to funnel (optional)", inline folder picker, and inline tag input blocks.
- Add an **Enrollment object** selector (Contact / Lead / Deal / Booking / Conversation / Payment / Subscription), same list used in workflows.
- Add an **Enrollment trigger card** identical to workflows:
  - Gold trigger node with friendly label from `friendlyTriggerLabel()`
  - Configured / Incomplete / Error pill from `configurationStatus()`
  - One-line summary from `buildTriggerSummary()` and scope chips from `scopeSummary()`
  - **Edit trigger** button opens the existing `EnrollmentTriggerDrawer`
  - **Test trigger** button (uses existing `test-workflow-trigger` edge function; we'll extend it to accept `{ source, event, trigger_config, filter_groups, workspace_id }` without needing a workflow id)

**Reuse without changes**:
- `src/lib/workflows/triggerCatalog.ts`
- `src/components/workflows/EnrollmentTriggerDrawer.tsx`
- `src/components/workflows/FilterGroupBuilder.tsx`

Keep the existing **Workflow / Timeline / History / Health / Logs** tabs in `AutomationDetailsDrawer` untouched.

### 3. Hook + save/load — `useAutomations.ts`

- Extend the `Automation` type and `createAutomation` / `updateAutomation` mutation payloads with the new columns.
- On save, also derive and store `trigger_summary`. Continue writing legacy `trigger_type` alongside the new fields (so the DB trigger `enqueue_folder_automations` and any live executors keep working — no runtime behaviour changes in this task).
- On load, if new fields are null, fall back to the legacy `trigger_type` mapping so the new UI renders correctly for pre-migration rows.

### 4. Back-compat guardrails

- Runtime executors (`enqueue_folder_automations`, `fireTriggers.ts`, `execute-automation` edge function) keep reading `trigger_type` / `trigger_config`. This task does **not** switch execution over; it only changes the configuration surface.
- No automation is auto-converted between sources; the mapping is purely for display until the user re-saves.

### 5. Where the "Edit trigger" button lives after this ships

- `/dashboard/:workspaceId/automations` → open any automation row → **Workflow tab** → **Enrollment trigger** card → **Edit** button (right-side drawer).
- Same button also appears in the **Create Automation** dialog once you pick a name.

### Files to edit / create

- **Migration** — `supabase/migrations/<ts>_add_automation_enrollment_structure.sql`
- **Edit** `src/hooks/useAutomations.ts` (type, mutations, load-time fallback mapping)
- **Edit** `src/components/automations/CreateAutomationDialog.tsx` (replace trigger block)
- **Edit** `src/components/automations/AutomationDetailsDrawer.tsx` (replace trigger block)
- **Edit** `supabase/functions/test-workflow-trigger/index.ts` (accept ad-hoc payload, no workflow id required)
- **Edit** `src/integrations/supabase/types.ts` after migration approval

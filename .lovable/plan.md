## Goal

Rework only the workflow details area and the first trigger node in the existing editor. Everything else (palette, canvas, action/condition nodes, Timeline / History / Health / Logs tabs, `execute-workflow` engine) stays as-is.

## Database changes

Migration 1 — extend `workflows`:

- `enrollment_object_type text` (contact | lead | deal | booking | conversation | payment | subscription) — default `'lead'`
- `enrollment_method text` (event | filter | schedule | webhook | manual) — default `'event'`
- `trigger_source text` (crm, forms, funnels, meta_lead_ads, linkedin_lead_gen, google_lead_forms, bookings, email, whatsapp, sms, payments, campaigns, webhooks)
- `trigger_event text` (machine key, e.g. `meta_lead_received`)
- `trigger_config jsonb` default `'{}'` — source-specific scope (funnel_id, page_id, calendar_id, meta connection/page/form/campaign/adset/ad ids, any-value flags, etc.)
- `filter_groups jsonb` default `'[]'` — AND/OR groups of `{property, operator, value}`
- `reenrollment_config jsonb` default `'{"mode":"never"}'`
- `deduplication_key text` — e.g. `meta.leadgen_id`
- `trigger_summary text` — plain-English sentence rendered on the node
- `last_tested_at timestamptz`
- `folder_id uuid` (nullable) — Folder field in details

Backfill for existing rows using the current `canvas_json` trigger node:
- `campaign_completed` → source `campaigns`, event `campaign_completed`
- `new_lead` / `lead_tagged` / `lead_added_to_folder` / `score_threshold` → source `crm`
- `form_submitted` → source `forms`
- `funnel_step_completed` → source `funnels`
- `appointment_booked` → source `bookings`
- `whatsapp_replied` / `sms_replied` / `email_opened|_not_opened` / `link_clicked` → source `whatsapp|sms|email`
- `purchase_event` → source `payments`
- `trial_*` / `subscription_cancelled` → source `subscriptions`
- Never remap `campaign_completed` to `meta_lead_received`.
- Default `enrollment_object_type = 'lead'` for all.
- Copy trigger node `config` into `trigger_config`.

Migration 2 — new `processed_automation_events`:
```text
id uuid pk, workspace_id uuid not null, workflow_id uuid not null references workflows on delete cascade,
event_key text not null, external_event_id text not null,
event_payload jsonb, processed_at timestamptz default now(), status text default 'processed'
UNIQUE (workspace_id, workflow_id, external_event_id)
```
- GRANTs: `authenticated` select-only; `service_role` all.
- RLS: members of the workspace can select via `is_workspace_member`; only `service_role` writes.

Edge functions that already receive Meta / campaigns / booking events (`enroll-workflow-leads`, `meta-webhook`, etc.) will get a small guarded insert into this table keyed off `external_event_id` (Meta `leadgen_id`, campaign_message id, booking id, etc.). If the insert conflicts, the enrollment is skipped. No engine redesign.

## Frontend — Workflow details panel (`WorkflowSettings` in `WorkflowEditor.tsx`)

Keep: name, description, workflow owner, folder.

Remove: the current Trigger dropdown and the always-visible "Scope to funnel" field.

Add: **Enrollment object** select (Contact / Lead / Deal / Booking / Conversation / Payment / Subscription). Persists to `workflows.enrollment_object_type`. Changing it clears the trigger source if incompatible and marks the trigger node "Incomplete".

## Frontend — Enrollment trigger node

Replace the generic first trigger palette node behaviour so that every workflow always renders one gold-bordered "Enrollment trigger" node at the canvas root (auto-inserted if missing). The node card shows:

- Header: "Enrollment trigger" with configuration status pill (green Configured / amber Incomplete / red Error).
- Friendly trigger label (e.g. "New Facebook lead received"), never the raw key.
- Rows: Enrollment object, Trigger source, Trigger event, key config summary (e.g. "Page: NexusFlo24 · Form: Free WhatsApp Audit"), Re-enrollment setting.
- Buttons: **Edit trigger** (opens drawer), **Test trigger**.

A `triggerCatalog.ts` maps `source → events[]` with `{key, label, description, requiredScopeFields}` and provides `friendlyLabel(source, event)` and `buildSummary(workflow)` used by the node and the details panel.

## Frontend — Trigger configuration drawer (right side)

New component `EnrollmentTriggerDrawer` opened from Edit trigger. Stepped layout:

1. **Enrollment method** — radios: event, filter criteria, schedule, webhook, manual.
2. **Trigger source** — grid of the 13 sources above, filtered by the current `enrollment_object_type`.
3. **Trigger event** — list filtered to the selected source only. Friendly labels; stored keys retained.
4. **Scope fields** — rendered dynamically from the source's `requiredScopeFields`:
   - CRM: Pipeline, Stage, Owner, Lead source, Tags
   - Forms: Form
   - Funnels: Funnel, Page, Form, Funnel step
   - Bookings: Calendar, Booking type, Assigned user, Appointment status
   - Meta Lead Ads: Meta connection*, Ad account, Facebook Page*, Lead form*, Campaign, Ad set, Ad (starred = required)
   - Each dropdown supports "Any value" or a specific value.
5. **Additional filters** — reusable `FilterGroupBuilder` (AND / OR groups) with operators: is equal to, is not equal to, is any of, is none of, contains, does not contain, is known, is unknown, is greater than, is less than, is before, is after.
6. **Re-enrollment** — radios: never, every event, when conditions become true again, after waiting period (+ duration input). Meta Lead Ads defaults to "Re-enroll for every unique lead form submission" with `deduplication_key = 'meta.leadgen_id'`.
7. **Test trigger** panel — for Meta shows most recent lead payload (via new `test-workflow-trigger` edge function) and a "Send test lead" button (guides to Meta test tool), renders received payload, mapped contact fields, and pass/fail against filters. Marked test-only — never invokes `execute-workflow`.
8. Live **Trigger summary** at the top ("Enrol leads when a new submission is received from the NexusFlo24 Facebook Page through the Free WhatsApp Follow-Up Audit form."), saved to `trigger_summary`.

Drawer save patches all `workflows.*` trigger columns and updates the canvas trigger node's `data.config` / `data.subType` / `data.label` so the engine's existing trigger matching keeps working.

## Backend — deduplication guard

`enroll-workflow-leads` (and the Meta webhook feeder) attempt to insert into `processed_automation_events` before enrolling. Unique-constraint violation → skip enrollment and log a `duplicate_event` breadcrumb into `workflow_logs`. This is the only engine change.

## Security

- New columns and table remain workspace-scoped via `is_workspace_member`.
- Trigger drawer only reads sources for the current workspace (Meta connections, funnels, forms, calendars, pipelines).

## Design

Follows current tokens — navy headings, gold trigger node border, green/amber/red status pills, rounded cards, right-side drawer using shadcn `Sheet`. No visual redesign outside the details panel, trigger node, and drawer.

## Files touched

- `supabase/migrations/<ts>_workflow_enrollment_trigger.sql` (schema + backfill + processed_automation_events)
- `src/lib/workflows/triggerCatalog.ts` (new)
- `src/lib/workflows/types.ts` (add new fields to `Workflow`)
- `src/pages/dashboard/WorkflowEditor.tsx` (details panel, ensure enrollment trigger node, wire drawer)
- `src/components/workflows/EnrollmentTriggerNodeCard.tsx` (new)
- `src/components/workflows/EnrollmentTriggerDrawer.tsx` (new)
- `src/components/workflows/FilterGroupBuilder.tsx` (new)
- `src/hooks/useWorkflows.ts` (patch mutation covers new fields)
- `supabase/functions/enroll-workflow-leads/index.ts` (dedupe insert)
- `supabase/functions/test-workflow-trigger/index.ts` (new, test-only)

Existing workflows continue to run unchanged; their canvas trigger node stays and the mirrored `workflows.trigger_*` columns feed the new UI.
